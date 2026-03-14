const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ── Get Stock Ledger ─────────────────────────────────────────────
router.get('/', authenticateToken, (req, res) => {
  try {
    const { product_id, location_id, operation_type, limit, offset } = req.query;
    let query = `
      SELECT sl.*, p.name as product_name, p.sku,
             l.name as location_name, w.name as warehouse_name
      FROM stock_ledger sl
      JOIN products p ON sl.product_id = p.id
      JOIN locations l ON sl.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
    `;
    const conditions = [];
    const params = [];

    if (product_id) { conditions.push('sl.product_id = ?'); params.push(product_id); }
    if (location_id) { conditions.push('sl.location_id = ?'); params.push(location_id); }
    if (operation_type) { conditions.push('sl.operation_type = ?'); params.push(operation_type); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');

    // Count total
    const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as total FROM');
    const total = db.prepare(countQuery).get(...params).total;

    query += ' ORDER BY sl.created_at DESC';
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit) || 50, parseInt(offset) || 0);

    const entries = db.prepare(query).all(...params);
    res.json({ entries, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
