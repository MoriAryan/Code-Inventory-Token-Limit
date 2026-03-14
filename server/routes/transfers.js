const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function generateRef() {
  return 'TRF-' + Date.now().toString(36).toUpperCase();
}

// ── List Transfers ───────────────────────────────────────────────
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT t.*,
        fl.name as from_location_name, fw.name as from_warehouse_name,
        tl.name as to_location_name, tw.name as to_warehouse_name
      FROM transfers t
      JOIN locations fl ON t.from_location_id = fl.id
      JOIN warehouses fw ON fl.warehouse_id = fw.id
      JOIN locations tl ON t.to_location_id = tl.id
      JOIN warehouses tw ON tl.warehouse_id = tw.id
    `;

    if (status) {
      query += ' WHERE t.status = ?';
      const transfers = db.prepare(query + ' ORDER BY t.created_at DESC').all(status);
      return res.json(transfers);
    }

    const transfers = db.prepare(query + ' ORDER BY t.created_at DESC').all();
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Single Transfer ──────────────────────────────────────────
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const transfer = db.prepare(`
      SELECT t.*,
        fl.name as from_location_name, fw.name as from_warehouse_name,
        tl.name as to_location_name, tw.name as to_warehouse_name
      FROM transfers t
      JOIN locations fl ON t.from_location_id = fl.id
      JOIN warehouses fw ON fl.warehouse_id = fw.id
      JOIN locations tl ON t.to_location_id = tl.id
      JOIN warehouses tw ON tl.warehouse_id = tw.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });

    const lines = db.prepare(`
      SELECT tl.*, p.name as product_name, p.sku
      FROM transfer_lines tl
      JOIN products p ON tl.product_id = p.id
      WHERE tl.transfer_id = ?
    `).all(req.params.id);

    transfer.lines = lines;
    res.json(transfer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create Transfer ──────────────────────────────────────────────
router.post('/', authenticateToken, (req, res) => {
  try {
    const { from_location_id, to_location_id, notes, lines } = req.body;
    if (!from_location_id || !to_location_id) {
      return res.status(400).json({ error: 'Source and destination locations are required' });
    }
    if (from_location_id === to_location_id) {
      return res.status(400).json({ error: 'Source and destination must be different' });
    }
    if (!lines || !lines.length) return res.status(400).json({ error: 'At least one product line is required' });

    const reference = generateRef();

    const txn = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO transfers (reference, from_location_id, to_location_id, status, notes)
        VALUES (?, ?, ?, 'draft', ?)
      `).run(reference, from_location_id, to_location_id, notes || null);

      const transferId = result.lastInsertRowid;

      for (const line of lines) {
        if (!line.product_id || !line.quantity || line.quantity <= 0) {
          throw new Error('Each line must have a valid product_id and positive quantity');
        }
        db.prepare('INSERT INTO transfer_lines (transfer_id, product_id, quantity) VALUES (?, ?, ?)')
          .run(transferId, line.product_id, line.quantity);
      }

      return transferId;
    });

    const transferId = txn();
    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(transferId);
    transfer.lines = db.prepare(`
      SELECT tl.*, p.name as product_name, p.sku
      FROM transfer_lines tl
      JOIN products p ON tl.product_id = p.id
      WHERE tl.transfer_id = ?
    `).all(transferId);

    res.status(201).json(transfer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Validate Transfer → Move Stock ───────────────────────────────
router.post('/:id/validate', authenticateToken, (req, res) => {
  try {
    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(req.params.id);
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    if (transfer.status === 'done') return res.status(400).json({ error: 'Transfer already validated' });
    if (transfer.status === 'cancelled') return res.status(400).json({ error: 'Cannot validate cancelled transfer' });

    const lines = db.prepare('SELECT * FROM transfer_lines WHERE transfer_id = ?').all(req.params.id);
    if (!lines.length) return res.status(400).json({ error: 'Transfer has no products' });

    const upsertStock = db.prepare(`
      INSERT INTO stock (product_id, location_id, quantity)
      VALUES (?, ?, ?)
      ON CONFLICT(product_id, location_id)
      DO UPDATE SET quantity = quantity + excluded.quantity
    `);

    const txn = db.transaction(() => {
      for (const line of lines) {
        // Check source stock
        const sourceStock = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?')
          .get(line.product_id, transfer.from_location_id);

        const currentQty = sourceStock ? sourceStock.quantity : 0;
        if (currentQty < line.quantity) {
          const product = db.prepare('SELECT name FROM products WHERE id = ?').get(line.product_id);
          throw new Error(`Insufficient stock for ${product.name} at source. Available: ${currentQty}, Requested: ${line.quantity}`);
        }

        // Decrease source
        db.prepare('UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND location_id = ?')
          .run(line.quantity, line.product_id, transfer.from_location_id);

        // Increase destination
        upsertStock.run(line.product_id, transfer.to_location_id, line.quantity);

        // Ledger: source decrease
        const newSourceStock = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?')
          .get(line.product_id, transfer.from_location_id);
        db.prepare(`
          INSERT INTO stock_ledger (product_id, location_id, operation_type, reference, quantity_change, quantity_after)
          VALUES (?, ?, 'transfer_out', ?, ?, ?)
        `).run(line.product_id, transfer.from_location_id, transfer.reference, -line.quantity, newSourceStock.quantity);

        // Ledger: destination increase
        const newDestStock = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?')
          .get(line.product_id, transfer.to_location_id);
        db.prepare(`
          INSERT INTO stock_ledger (product_id, location_id, operation_type, reference, quantity_change, quantity_after)
          VALUES (?, ?, 'transfer_in', ?, ?, ?)
        `).run(line.product_id, transfer.to_location_id, transfer.reference, line.quantity, newDestStock.quantity);
      }

      db.prepare('UPDATE transfers SET status = ?, validated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('done', req.params.id);
    });

    txn();
    const updated = db.prepare('SELECT * FROM transfers WHERE id = ?').get(req.params.id);
    res.json({ message: 'Transfer validated. Stock moved.', transfer: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
