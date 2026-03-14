const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ── List Warehouses ──────────────────────────────────────────────
router.get('/', authenticateToken, (req, res) => {
  try {
    const warehouses = db.prepare(`
      SELECT w.*, COUNT(l.id) as location_count
      FROM warehouses w
      LEFT JOIN locations l ON w.id = l.warehouse_id
      GROUP BY w.id
      ORDER BY w.name
    `).all();
    res.json(warehouses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create Warehouse ─────────────────────────────────────────────
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Warehouse name is required' });

    const result = db.prepare('INSERT INTO warehouses (name, address) VALUES (?, ?)').run(name, address || null);
    const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(warehouse);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Warehouse name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── Update Warehouse ─────────────────────────────────────────────
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { name, address } = req.body;
    const existing = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Warehouse not found' });

    db.prepare('UPDATE warehouses SET name = ?, address = ? WHERE id = ?')
      .run(name || existing.name, address !== undefined ? address : existing.address, req.params.id);

    const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(req.params.id);
    res.json(warehouse);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Warehouse name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── Get Locations in Warehouse ───────────────────────────────────
router.get('/:id/locations', authenticateToken, (req, res) => {
  try {
    const locations = db.prepare(`
      SELECT l.*, w.name as warehouse_name
      FROM locations l
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE l.warehouse_id = ?
      ORDER BY l.name
    `).all(req.params.id);
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get All Locations ────────────────────────────────────────────
router.get('/locations/all', authenticateToken, (req, res) => {
  try {
    const locations = db.prepare(`
      SELECT l.*, w.name as warehouse_name
      FROM locations l
      JOIN warehouses w ON l.warehouse_id = w.id
      ORDER BY w.name, l.name
    `).all();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create Location ──────────────────────────────────────────────
router.post('/locations', authenticateToken, (req, res) => {
  try {
    const { warehouse_id, name, type } = req.body;
    if (!warehouse_id || !name) {
      return res.status(400).json({ error: 'Warehouse and location name are required' });
    }

    const warehouse = db.prepare('SELECT id FROM warehouses WHERE id = ?').get(warehouse_id);
    if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' });

    const result = db.prepare('INSERT INTO locations (warehouse_id, name, type) VALUES (?, ?, ?)')
      .run(warehouse_id, name, type || 'shelf');

    const location = db.prepare(`
      SELECT l.*, w.name as warehouse_name
      FROM locations l
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE l.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(location);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Suppliers ────────────────────────────────────────────────────
router.get('/suppliers', authenticateToken, (req, res) => {
  try {
    const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name').all();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/suppliers', authenticateToken, (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'Supplier name is required' });

    const result = db.prepare('INSERT INTO suppliers (name, email, phone) VALUES (?, ?, ?)')
      .run(name, email || null, phone || null);
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Customers ────────────────────────────────────────────────────
router.get('/customers', authenticateToken, (req, res) => {
  try {
    const customers = db.prepare('SELECT * FROM customers ORDER BY name').all();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/customers', authenticateToken, (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required' });

    const result = db.prepare('INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)')
      .run(name, email || null, phone || null);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
