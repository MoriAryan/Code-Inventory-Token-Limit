const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ── List Products ────────────────────────────────────────────────
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, category_id, low_stock } = req.query;
    let query = `
      SELECT p.*, c.name as category_name,
        COALESCE(SUM(s.quantity), 0) as total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock s ON p.id = s.product_id
    `;
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category_id) {
      conditions.push('p.category_id = ?');
      params.push(category_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY p.id';

    if (low_stock === 'true') {
      query += ' HAVING total_stock <= p.reorder_level';
    }

    query += ' ORDER BY p.name';

    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Single Product with Stock per Location ───────────────────
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const product = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!product) return res.status(404).json({ error: 'Product not found' });

    const stockByLocation = db.prepare(`
      SELECT s.quantity, l.name as location_name, l.id as location_id,
             w.name as warehouse_name, w.id as warehouse_id
      FROM stock s
      JOIN locations l ON s.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE s.product_id = ?
    `).all(req.params.id);

    product.stock = stockByLocation;
    product.total_stock = stockByLocation.reduce((sum, s) => sum + s.quantity, 0);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create Product ───────────────────────────────────────────────
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, sku, category_id, unit_of_measure, reorder_level } = req.body;
    if (!name || !sku) {
      return res.status(400).json({ error: 'Product name and SKU are required' });
    }

    const result = db.prepare(`
      INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, sku, category_id || null, unit_of_measure || 'unit', reorder_level || 10);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(product);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── Update Product ───────────────────────────────────────────────
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { name, sku, category_id, unit_of_measure, reorder_level } = req.body;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    db.prepare(`
      UPDATE products SET name = ?, sku = ?, category_id = ?, unit_of_measure = ?, reorder_level = ?
      WHERE id = ?
    `).run(
      name || existing.name,
      sku || existing.sku,
      category_id !== undefined ? category_id : existing.category_id,
      unit_of_measure || existing.unit_of_measure,
      reorder_level !== undefined ? reorder_level : existing.reorder_level,
      req.params.id
    );

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json(product);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── Delete Product ───────────────────────────────────────────────
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── List Categories ──────────────────────────────────────────────
router.get('/categories/list', authenticateToken, (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create Category ──────────────────────────────────────────────
router.post('/categories', authenticateToken, (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    const result = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description || null);
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(category);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
