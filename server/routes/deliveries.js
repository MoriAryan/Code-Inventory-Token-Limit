const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function generateRef() {
  return 'DEL-' + Date.now().toString(36).toUpperCase();
}

// ── List Deliveries ──────────────────────────────────────────────
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status, customer_id, location_id } = req.query;
    let query = `
      SELECT d.*, c.name as customer_name, l.name as location_name, w.name as warehouse_name
      FROM deliveries d
      LEFT JOIN customers c ON d.customer_id = c.id
      JOIN locations l ON d.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
    `;
    const conditions = [];
    const params = [];

    if (status) { conditions.push('d.status = ?'); params.push(status); }
    if (customer_id) { conditions.push('d.customer_id = ?'); params.push(customer_id); }
    if (location_id) { conditions.push('d.location_id = ?'); params.push(location_id); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY d.created_at DESC';

    const deliveries = db.prepare(query).all(...params);
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Single Delivery ──────────────────────────────────────────
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const delivery = db.prepare(`
      SELECT d.*, c.name as customer_name, l.name as location_name, w.name as warehouse_name
      FROM deliveries d
      LEFT JOIN customers c ON d.customer_id = c.id
      JOIN locations l ON d.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE d.id = ?
    `).get(req.params.id);

    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    const lines = db.prepare(`
      SELECT dl.*, p.name as product_name, p.sku
      FROM delivery_lines dl
      JOIN products p ON dl.product_id = p.id
      WHERE dl.delivery_id = ?
    `).all(req.params.id);

    delivery.lines = lines;
    res.json(delivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create Delivery ──────────────────────────────────────────────
router.post('/', authenticateToken, (req, res) => {
  try {
    const { customer_id, location_id, notes, lines } = req.body;
    if (!location_id) return res.status(400).json({ error: 'Location is required' });
    if (!lines || !lines.length) return res.status(400).json({ error: 'At least one product line is required' });

    const reference = generateRef();

    const txn = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO deliveries (reference, customer_id, location_id, status, notes)
        VALUES (?, ?, ?, 'draft', ?)
      `).run(reference, customer_id || null, location_id, notes || null);

      const deliveryId = result.lastInsertRowid;

      for (const line of lines) {
        if (!line.product_id || !line.quantity || line.quantity <= 0) {
          throw new Error('Each line must have a valid product_id and positive quantity');
        }
        db.prepare('INSERT INTO delivery_lines (delivery_id, product_id, quantity) VALUES (?, ?, ?)')
          .run(deliveryId, line.product_id, line.quantity);
      }

      return deliveryId;
    });

    const deliveryId = txn();
    const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(deliveryId);
    delivery.lines = db.prepare(`
      SELECT dl.*, p.name as product_name, p.sku
      FROM delivery_lines dl
      JOIN products p ON dl.product_id = p.id
      WHERE dl.delivery_id = ?
    `).all(deliveryId);

    res.status(201).json(delivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update Delivery Status ───────────────────────────────────────
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { status, notes } = req.body;
    const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    if (delivery.status === 'done' || delivery.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot modify a completed or cancelled delivery' });
    }

    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

    if (updates.length) {
      params.push(req.params.id);
      db.prepare(`UPDATE deliveries SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Validate Delivery → Decrease Stock ───────────────────────────
router.post('/:id/validate', authenticateToken, (req, res) => {
  try {
    const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (delivery.status === 'done') return res.status(400).json({ error: 'Delivery already validated' });
    if (delivery.status === 'cancelled') return res.status(400).json({ error: 'Cannot validate cancelled delivery' });

    const lines = db.prepare('SELECT * FROM delivery_lines WHERE delivery_id = ?').all(req.params.id);
    if (!lines.length) return res.status(400).json({ error: 'Delivery has no products' });

    const txn = db.transaction(() => {
      for (const line of lines) {
        const stock = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?')
          .get(line.product_id, delivery.location_id);

        const currentQty = stock ? stock.quantity : 0;
        if (currentQty < line.quantity) {
          const product = db.prepare('SELECT name FROM products WHERE id = ?').get(line.product_id);
          throw new Error(`Insufficient stock for ${product.name}. Available: ${currentQty}, Requested: ${line.quantity}`);
        }

        db.prepare(`
          UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND location_id = ?
        `).run(line.quantity, line.product_id, delivery.location_id);

        const newStock = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?')
          .get(line.product_id, delivery.location_id);

        db.prepare(`
          INSERT INTO stock_ledger (product_id, location_id, operation_type, reference, quantity_change, quantity_after)
          VALUES (?, ?, 'delivery', ?, ?, ?)
        `).run(line.product_id, delivery.location_id, delivery.reference, -line.quantity, newStock.quantity);
      }

      db.prepare('UPDATE deliveries SET status = ?, validated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('done', req.params.id);
    });

    txn();
    const updated = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
    res.json({ message: 'Delivery validated. Stock updated.', delivery: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
