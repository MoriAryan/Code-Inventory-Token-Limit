const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function generateRef() {
  return 'ADJ-' + Date.now().toString(36).toUpperCase();
}

// ── List Adjustments ─────────────────────────────────────────────
router.get('/', authenticateToken, (req, res) => {
  try {
    const { product_id, location_id } = req.query;
    let query = `
      SELECT a.*, p.name as product_name, p.sku,
             l.name as location_name, w.name as warehouse_name
      FROM adjustments a
      JOIN products p ON a.product_id = p.id
      JOIN locations l ON a.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
    `;
    const conditions = [];
    const params = [];

    if (product_id) { conditions.push('a.product_id = ?'); params.push(product_id); }
    if (location_id) { conditions.push('a.location_id = ?'); params.push(location_id); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY a.created_at DESC';

    const adjustments = db.prepare(query).all(...params);
    res.json(adjustments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create Adjustment ────────────────────────────────────────────
router.post('/', authenticateToken, (req, res) => {
  try {
    const { product_id, location_id, actual_qty, reason } = req.body;
    if (!product_id || !location_id || actual_qty === undefined) {
      return res.status(400).json({ error: 'Product, location, and actual quantity are required' });
    }
    if (actual_qty < 0) {
      return res.status(400).json({ error: 'Actual quantity cannot be negative' });
    }

    const reference = generateRef();

    const txn = db.transaction(() => {
      // Get current recorded stock
      const currentStock = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?')
        .get(product_id, location_id);

      const recorded_qty = currentStock ? currentStock.quantity : 0;
      const difference = actual_qty - recorded_qty;

      // Upsert stock to actual quantity
      db.prepare(`
        INSERT INTO stock (product_id, location_id, quantity)
        VALUES (?, ?, ?)
        ON CONFLICT(product_id, location_id)
        DO UPDATE SET quantity = excluded.quantity
      `).run(product_id, location_id, actual_qty);

      // Create adjustment record
      const result = db.prepare(`
        INSERT INTO adjustments (reference, product_id, location_id, recorded_qty, actual_qty, difference, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(reference, product_id, location_id, recorded_qty, actual_qty, difference, reason || null);

      // Log in ledger
      db.prepare(`
        INSERT INTO stock_ledger (product_id, location_id, operation_type, reference, quantity_change, quantity_after)
        VALUES (?, ?, 'adjustment', ?, ?, ?)
      `).run(product_id, location_id, reference, difference, actual_qty);

      return result.lastInsertRowid;
    });

    const adjustmentId = txn();
    const adjustment = db.prepare(`
      SELECT a.*, p.name as product_name, p.sku,
             l.name as location_name, w.name as warehouse_name
      FROM adjustments a
      JOIN products p ON a.product_id = p.id
      JOIN locations l ON a.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE a.id = ?
    `).get(adjustmentId);

    res.status(201).json(adjustment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
