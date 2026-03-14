const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function generateRef() {
  return 'RCP-' + Date.now().toString(36).toUpperCase();
}

// ── List Receipts ────────────────────────────────────────────────
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status, supplier_id, location_id } = req.query;
    let query = `
      SELECT r.*, s.name as supplier_name, l.name as location_name, w.name as warehouse_name
      FROM receipts r
      LEFT JOIN suppliers s ON r.supplier_id = s.id
      JOIN locations l ON r.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
    `;
    const conditions = [];
    const params = [];

    if (status) { conditions.push('r.status = ?'); params.push(status); }
    if (supplier_id) { conditions.push('r.supplier_id = ?'); params.push(supplier_id); }
    if (location_id) { conditions.push('r.location_id = ?'); params.push(location_id); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY r.created_at DESC';

    const receipts = db.prepare(query).all(...params);
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Single Receipt ───────────────────────────────────────────
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const receipt = db.prepare(`
      SELECT r.*, s.name as supplier_name, l.name as location_name, w.name as warehouse_name
      FROM receipts r
      LEFT JOIN suppliers s ON r.supplier_id = s.id
      JOIN locations l ON r.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

    const lines = db.prepare(`
      SELECT rl.*, p.name as product_name, p.sku
      FROM receipt_lines rl
      JOIN products p ON rl.product_id = p.id
      WHERE rl.receipt_id = ?
    `).all(req.params.id);

    receipt.lines = lines;
    res.json(receipt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create Receipt ───────────────────────────────────────────────
router.post('/', authenticateToken, (req, res) => {
  try {
    const { supplier_id, location_id, notes, lines } = req.body;
    if (!location_id) return res.status(400).json({ error: 'Location is required' });
    if (!lines || !lines.length) return res.status(400).json({ error: 'At least one product line is required' });

    const reference = generateRef();

    const insertReceipt = db.prepare(`
      INSERT INTO receipts (reference, supplier_id, location_id, status, notes)
      VALUES (?, ?, ?, 'draft', ?)
    `);

    const insertLine = db.prepare(`
      INSERT INTO receipt_lines (receipt_id, product_id, quantity) VALUES (?, ?, ?)
    `);

    const txn = db.transaction(() => {
      const result = insertReceipt.run(reference, supplier_id || null, location_id, notes || null);
      const receiptId = result.lastInsertRowid;

      for (const line of lines) {
        if (!line.product_id || !line.quantity || line.quantity <= 0) {
          throw new Error('Each line must have a valid product_id and positive quantity');
        }
        insertLine.run(receiptId, line.product_id, line.quantity);
      }

      return receiptId;
    });

    const receiptId = txn();
    const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(receiptId);
    const receiptLines = db.prepare(`
      SELECT rl.*, p.name as product_name, p.sku
      FROM receipt_lines rl
      JOIN products p ON rl.product_id = p.id
      WHERE rl.receipt_id = ?
    `).all(receiptId);

    receipt.lines = receiptLines;
    res.status(201).json(receipt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update Receipt Status ────────────────────────────────────────
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { status, notes } = req.body;
    const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(req.params.id);
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

    if (receipt.status === 'done' || receipt.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot modify a completed or cancelled receipt' });
    }

    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

    if (updates.length) {
      params.push(req.params.id);
      db.prepare(`UPDATE receipts SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare('SELECT * FROM receipts WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Validate Receipt → Increase Stock ────────────────────────────
router.post('/:id/validate', authenticateToken, (req, res) => {
  try {
    const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(req.params.id);
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    if (receipt.status === 'done') return res.status(400).json({ error: 'Receipt already validated' });
    if (receipt.status === 'cancelled') return res.status(400).json({ error: 'Cannot validate cancelled receipt' });

    const lines = db.prepare('SELECT * FROM receipt_lines WHERE receipt_id = ?').all(req.params.id);
    if (!lines.length) return res.status(400).json({ error: 'Receipt has no products' });

    const upsertStock = db.prepare(`
      INSERT INTO stock (product_id, location_id, quantity)
      VALUES (?, ?, ?)
      ON CONFLICT(product_id, location_id)
      DO UPDATE SET quantity = quantity + excluded.quantity
    `);

    const insertLedger = db.prepare(`
      INSERT INTO stock_ledger (product_id, location_id, operation_type, reference, quantity_change, quantity_after)
      VALUES (?, ?, 'receipt', ?, ?, ?)
    `);

    const txn = db.transaction(() => {
      for (const line of lines) {
        upsertStock.run(line.product_id, receipt.location_id, line.quantity);

        const stock = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?')
          .get(line.product_id, receipt.location_id);

        insertLedger.run(line.product_id, receipt.location_id, receipt.reference, line.quantity, stock.quantity);
      }

      db.prepare('UPDATE receipts SET status = ?, validated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('done', req.params.id);
    });

    txn();
    const updated = db.prepare('SELECT * FROM receipts WHERE id = ?').get(req.params.id);
    res.json({ message: 'Receipt validated. Stock updated.', receipt: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
