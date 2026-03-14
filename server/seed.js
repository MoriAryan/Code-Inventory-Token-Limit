const db = require('./db');
const bcrypt = require('bcryptjs');

console.log('🌱 Seeding demo data...\n');

const seed = db.transaction(() => {
  // ── Clear existing data ──────────────────────────────────────
  db.exec(`
    DELETE FROM stock_ledger;
    DELETE FROM adjustments;
    DELETE FROM transfer_lines;
    DELETE FROM transfers;
    DELETE FROM delivery_lines;
    DELETE FROM deliveries;
    DELETE FROM receipt_lines;
    DELETE FROM receipts;
    DELETE FROM stock;
    DELETE FROM products;
    DELETE FROM locations;
    DELETE FROM warehouses;
    DELETE FROM categories;
    DELETE FROM suppliers;
    DELETE FROM customers;
    DELETE FROM users;
  `);

  // ── Demo User ────────────────────────────────────────────────
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(
    'Admin User', 'admin@coreinventory.com', hash, 'admin'
  );
  console.log('  ✅ User: admin@coreinventory.com / admin123');

  // ── Categories ───────────────────────────────────────────────
  const cats = [
    ['Raw Materials', 'Unprocessed materials for manufacturing'],
    ['Finished Goods', 'Products ready for sale'],
    ['Electronics', 'Electronic components and devices'],
    ['Packaging', 'Packaging materials and supplies'],
    ['Furniture', 'Office and warehouse furniture'],
  ];
  for (const [name, desc] of cats) {
    db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, desc);
  }
  console.log('  ✅ 5 Categories created');

  // ── Warehouses ───────────────────────────────────────────────
  const wh1 = db.prepare('INSERT INTO warehouses (name, address) VALUES (?, ?)').run(
    'Main Warehouse', '123 Industrial Road, Mumbai'
  ).lastInsertRowid;
  const wh2 = db.prepare('INSERT INTO warehouses (name, address) VALUES (?, ?)').run(
    'East Hub', '456 Commerce Blvd, Pune'
  ).lastInsertRowid;
  console.log('  ✅ 2 Warehouses created');

  // ── Locations ────────────────────────────────────────────────
  const loc1 = db.prepare('INSERT INTO locations (warehouse_id, name, type) VALUES (?, ?, ?)').run(wh1, 'Receiving Bay', 'receiving').lastInsertRowid;
  const loc2 = db.prepare('INSERT INTO locations (warehouse_id, name, type) VALUES (?, ?, ?)').run(wh1, 'Rack A', 'shelf').lastInsertRowid;
  const loc3 = db.prepare('INSERT INTO locations (warehouse_id, name, type) VALUES (?, ?, ?)').run(wh1, 'Rack B', 'shelf').lastInsertRowid;
  const loc4 = db.prepare('INSERT INTO locations (warehouse_id, name, type) VALUES (?, ?, ?)').run(wh1, 'Production Floor', 'production').lastInsertRowid;
  const loc5 = db.prepare('INSERT INTO locations (warehouse_id, name, type) VALUES (?, ?, ?)').run(wh1, 'Shipping Zone', 'shipping').lastInsertRowid;
  const loc6 = db.prepare('INSERT INTO locations (warehouse_id, name, type) VALUES (?, ?, ?)').run(wh2, 'Storage Area A', 'shelf').lastInsertRowid;
  const loc7 = db.prepare('INSERT INTO locations (warehouse_id, name, type) VALUES (?, ?, ?)').run(wh2, 'Storage Area B', 'shelf').lastInsertRowid;
  console.log('  ✅ 7 Locations created');

  // ── Products ─────────────────────────────────────────────────
  const products = [
    ['Steel Rods', 'STL-ROD-001', 1, 'kg', 50],
    ['Copper Wire', 'COP-WIR-002', 1, 'meter', 100],
    ['Aluminum Sheet', 'ALM-SHT-003', 1, 'unit', 30],
    ['LED Display Panel', 'LED-DSP-004', 3, 'unit', 20],
    ['Circuit Board v2', 'CRB-V2-005', 3, 'unit', 50],
    ['Office Chair', 'OFC-CHR-006', 5, 'unit', 10],
    ['Standing Desk', 'STD-DSK-007', 5, 'unit', 5],
    ['Cardboard Box (L)', 'CBX-LRG-008', 4, 'unit', 200],
    ['Bubble Wrap Roll', 'BWR-ROL-009', 4, 'roll', 50],
    ['Wireless Mouse', 'WRL-MOS-010', 3, 'unit', 30],
  ];
  const prodIds = [];
  for (const [name, sku, cat, uom, reorder] of products) {
    const id = db.prepare('INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level) VALUES (?, ?, ?, ?, ?)').run(name, sku, cat, uom, reorder).lastInsertRowid;
    prodIds.push(id);
  }
  console.log('  ✅ 10 Products created');

  // ── Initial Stock ────────────────────────────────────────────
  const initialStock = [
    [prodIds[0], loc2, 200],   // Steel Rods in Rack A
    [prodIds[0], loc4, 50],    // Steel Rods on Production Floor
    [prodIds[1], loc2, 500],   // Copper Wire in Rack A
    [prodIds[2], loc2, 45],    // Aluminum Sheet in Rack A
    [prodIds[3], loc3, 60],    // LED Display in Rack B
    [prodIds[4], loc3, 120],   // Circuit Board in Rack B
    [prodIds[5], loc6, 25],    // Office Chair in East Hub
    [prodIds[6], loc6, 8],     // Standing Desk in East Hub
    [prodIds[7], loc5, 350],   // Cardboard Box in Shipping
    [prodIds[8], loc5, 75],    // Bubble Wrap in Shipping
    [prodIds[9], loc3, 5],     // Wireless Mouse - LOW STOCK
  ];
  for (const [pid, lid, qty] of initialStock) {
    db.prepare('INSERT INTO stock (product_id, location_id, quantity) VALUES (?, ?, ?)').run(pid, lid, qty);
  }
  console.log('  ✅ Initial stock levels set');

  // ── Suppliers ────────────────────────────────────────────────
  const sup1 = db.prepare('INSERT INTO suppliers (name, email, phone) VALUES (?, ?, ?)').run(
    'SteelMax Industries', 'orders@steelmax.com', '+91-9876543210'
  ).lastInsertRowid;
  const sup2 = db.prepare('INSERT INTO suppliers (name, email, phone) VALUES (?, ?, ?)').run(
    'TechParts Global', 'supply@techparts.com', '+91-9876543211'
  ).lastInsertRowid;
  const sup3 = db.prepare('INSERT INTO suppliers (name, email, phone) VALUES (?, ?, ?)').run(
    'PackRight Solutions', 'hello@packright.com', '+91-9876543212'
  ).lastInsertRowid;
  console.log('  ✅ 3 Suppliers created');

  // ── Customers ────────────────────────────────────────────────
  const cust1 = db.prepare('INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)').run(
    'BuildCorp Ltd', 'purchasing@buildcorp.com', '+91-9988776655'
  ).lastInsertRowid;
  const cust2 = db.prepare('INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)').run(
    'SmartOffice Inc', 'orders@smartoffice.com', '+91-9988776656'
  ).lastInsertRowid;
  console.log('  ✅ 2 Customers created');

  // ── Sample Receipt (Done) ────────────────────────────────────
  const rcpRef = 'RCP-SEED001';
  db.prepare(`
    INSERT INTO receipts (reference, supplier_id, location_id, status, notes, validated_at)
    VALUES (?, ?, ?, 'done', 'Initial stock receipt from SteelMax', CURRENT_TIMESTAMP)
  `).run(rcpRef, sup1, loc1);
  const rcpId = db.prepare('SELECT id FROM receipts WHERE reference = ?').get(rcpRef).id;
  db.prepare('INSERT INTO receipt_lines (receipt_id, product_id, quantity) VALUES (?, ?, ?)').run(rcpId, prodIds[0], 100);
  db.prepare('INSERT INTO receipt_lines (receipt_id, product_id, quantity) VALUES (?, ?, ?)').run(rcpId, prodIds[2], 25);

  // ── Sample Pending Receipt ───────────────────────────────────
  const rcpRef2 = 'RCP-SEED002';
  db.prepare(`
    INSERT INTO receipts (reference, supplier_id, location_id, status, notes)
    VALUES (?, ?, ?, 'waiting', 'Pending electronics shipment')
  `).run(rcpRef2, sup2, loc1);
  const rcpId2 = db.prepare('SELECT id FROM receipts WHERE reference = ?').get(rcpRef2).id;
  db.prepare('INSERT INTO receipt_lines (receipt_id, product_id, quantity) VALUES (?, ?, ?)').run(rcpId2, prodIds[3], 30);
  db.prepare('INSERT INTO receipt_lines (receipt_id, product_id, quantity) VALUES (?, ?, ?)').run(rcpId2, prodIds[4], 50);

  // ── Sample Delivery (Draft) ──────────────────────────────────
  const delRef = 'DEL-SEED001';
  db.prepare(`
    INSERT INTO deliveries (reference, customer_id, location_id, status, notes)
    VALUES (?, ?, ?, 'draft', 'BuildCorp steel order')
  `).run(delRef, cust1, loc2);
  const delId = db.prepare('SELECT id FROM deliveries WHERE reference = ?').get(delRef).id;
  db.prepare('INSERT INTO delivery_lines (delivery_id, product_id, quantity) VALUES (?, ?, ?)').run(delId, prodIds[0], 50);

  // ── Sample Transfer (Draft) ──────────────────────────────────
  const trfRef = 'TRF-SEED001';
  db.prepare(`
    INSERT INTO transfers (reference, from_location_id, to_location_id, status, notes)
    VALUES (?, ?, ?, 'draft', 'Move steel to production')
  `).run(trfRef, loc2, loc4);
  const trfId = db.prepare('SELECT id FROM transfers WHERE reference = ?').get(trfRef).id;
  db.prepare('INSERT INTO transfer_lines (transfer_id, product_id, quantity) VALUES (?, ?, ?)').run(trfId, prodIds[0], 30);

  // ── Ledger entries for initial receipt ────────────────────────
  db.prepare(`
    INSERT INTO stock_ledger (product_id, location_id, operation_type, reference, quantity_change, quantity_after)
    VALUES (?, ?, 'receipt', ?, 100, 200)
  `).run(prodIds[0], loc1, rcpRef);
  db.prepare(`
    INSERT INTO stock_ledger (product_id, location_id, operation_type, reference, quantity_change, quantity_after)
    VALUES (?, ?, 'receipt', ?, 25, 45)
  `).run(prodIds[2], loc1, rcpRef);

  console.log('  ✅ Sample operations created');
});

seed();
console.log('\n🎉 Seed complete! Start the server with: npm run server\n');
