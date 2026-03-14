const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ── Dashboard Analytics ──────────────────────────────────────────
router.get('/', authenticateToken, (req, res) => {
  try {
    const { warehouse_id, category_id } = req.query;

    // Total products count
    let productQuery = 'SELECT COUNT(*) as count FROM products';
    const productParams = [];
    if (category_id) {
      productQuery += ' WHERE category_id = ?';
      productParams.push(category_id);
    }
    const totalProducts = db.prepare(productQuery).get(...productParams).count;

    // Total stock quantity
    let stockQuery = `
      SELECT COALESCE(SUM(s.quantity), 0) as total
      FROM stock s
    `;
    const stockParams = [];
    if (warehouse_id) {
      stockQuery += ' JOIN locations l ON s.location_id = l.id WHERE l.warehouse_id = ?';
      stockParams.push(warehouse_id);
    }
    const totalStock = db.prepare(stockQuery).get(...stockParams).total;

    // Low stock items
    const lowStockItems = db.prepare(`
      SELECT p.id, p.name, p.sku, p.reorder_level, COALESCE(SUM(s.quantity), 0) as total_stock,
             c.name as category_name
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      GROUP BY p.id
      HAVING total_stock <= p.reorder_level
      ORDER BY total_stock ASC
    `).all();

    // Out of stock items
    const outOfStockItems = db.prepare(`
      SELECT p.id, p.name, p.sku, c.name as category_name
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      GROUP BY p.id
      HAVING COALESCE(SUM(s.quantity), 0) = 0
    `).all();

    // Pending receipts
    const pendingReceipts = db.prepare(`
      SELECT COUNT(*) as count FROM receipts WHERE status IN ('draft', 'waiting', 'ready')
    `).get().count;

    // Pending deliveries
    const pendingDeliveries = db.prepare(`
      SELECT COUNT(*) as count FROM deliveries WHERE status IN ('draft', 'waiting', 'ready')
    `).get().count;

    // Pending transfers
    const pendingTransfers = db.prepare(`
      SELECT COUNT(*) as count FROM transfers WHERE status IN ('draft', 'waiting', 'ready')
    `).get().count;

    // Recent operations (last 10)
    const recentOperations = db.prepare(`
      SELECT * FROM (
        SELECT id, reference, 'receipt' as type, status, created_at FROM receipts
        UNION ALL
        SELECT id, reference, 'delivery' as type, status, created_at FROM deliveries
        UNION ALL
        SELECT id, reference, 'transfer' as type, status, created_at FROM transfers
      )
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    // Operations by status
    const receiptsByStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM receipts GROUP BY status
    `).all();

    const deliveriesByStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM deliveries GROUP BY status
    `).all();

    const transfersByStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM transfers GROUP BY status
    `).all();

    res.json({
      kpis: {
        totalProducts,
        totalStock,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        pendingReceipts,
        pendingDeliveries,
        pendingTransfers
      },
      lowStockItems,
      outOfStockItems,
      recentOperations,
      operationsByStatus: {
        receipts: receiptsByStatus,
        deliveries: deliveriesByStatus,
        transfers: transfersByStatus
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
