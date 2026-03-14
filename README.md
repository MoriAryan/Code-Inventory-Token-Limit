# 🏭 CoreInventory – Modular Inventory Management System

> A production-quality, full-stack Inventory Management System that digitizes warehouse operations with real-time stock tracking, multi-warehouse support, and complete audit trails.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat&logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 📋 Problem Statement

Businesses managing physical inventory face critical challenges:
- **Manual Tracking**: Paper registers and spreadsheets lead to errors, delays, and data loss
- **No Visibility**: Managers can't see real-time stock levels across locations
- **Scattered Data**: Different teams track inventory in disconnected systems
- **No Audit Trail**: Stock discrepancies can't be traced to their source
- **Delayed Decisions**: Without live data, reordering and allocation decisions are reactive, not proactive

---

## 💡 Solution

**CoreInventory** replaces manual inventory tracking with a **centralized, real-time web application** that provides:

- **Unified Dashboard** – Instant KPI overview of stock health, pending operations, and alerts
- **Complete Operations** – Receipts, deliveries, transfers, and adjustments with automatic stock updates
- **Full Audit Trail** – Every stock movement logged in the Stock Ledger with timestamps
- **Multi-Warehouse** – Track inventory across warehouses and individual rack locations
- **Smart Alerts** – Automatic low stock and out-of-stock notifications

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React 18 + Vite)                 │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ │
│  │Dashboard│ │ Products │ │Operations│ │ Ledger │ │ Settings │ │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ └────┬─────┘ │
│       └──────────┬┴────────────┴────────────┴───────────┘       │
│                  │ Fetch API + JWT Auth                          │
├──────────────────┼──────────────────────────────────────────────┤
│                  ▼                                               │
│           Express.js REST API (Port 5000)                        │
│  ┌──────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐│
│  │ Auth │ │ Products │ │Receipts/ │ │Dashboard │ │Stock Ledger││
│  │Routes│ │  Routes  │ │Deliveries│ │Analytics │ │   Routes   ││
│  └──────┘ └──────────┘ │/Transfers│ └──────────┘ └────────────┘│
│                        └──────────┘                              │
│                  │ better-sqlite3                                │
├──────────────────┼──────────────────────────────────────────────┤
│                  ▼                                               │
│            SQLite Database (File-based)                          │
│    15 Tables: users, products, stock, receipts, deliveries,     │
│    transfers, adjustments, stock_ledger, categories, etc.        │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + Vite | Fast HMR, component-based UI |
| Backend | Node.js + Express | Rapid development, single runtime |
| Database | SQLite (better-sqlite3) | Zero-config, file-based, runs offline |
| Auth | JWT + bcrypt | Stateless, lightweight sessions |
| Styling | Vanilla CSS + CSS Variables | Full control, no dependencies |

### Key Design Decisions

1. **SQLite over PostgreSQL** – Zero setup for hackathon demos; file-based persistence that works without internet
2. **JWT over session cookies** – Stateless authentication, simpler API architecture
3. **Transactional stock updates** – All stock operations use SQLite transactions to prevent data corruption
4. **Stock Ledger pattern** – Every operation writes to an immutable audit trail
5. **Dark mode UI** – Modern warehouse dashboard aesthetic optimized for readability

---

## ✨ Features

### 🔐 Authentication
- User signup and login with bcrypt password hashing
- JWT-based session management (7-day tokens)
- OTP-based password reset (mock implementation for demo)

### 📊 Dashboard
- **7 KPI Cards**: Products, Total Stock, Low Stock, Out of Stock, Pending Receipts/Deliveries/Transfers
- **Low Stock Alerts Table**: Products below reorder level
- **Recent Operations Feed**: Latest receipts, deliveries, transfers with status badges
- Clickable KPIs for quick navigation

### 📦 Product Management
- Full CRUD with search by name/SKU
- Category-based filtering
- Stock level visualization bars (color-coded: green/yellow/red)
- Reorder level configuration

### 📥 Receipts (Incoming Goods)
- Create receipts with supplier selection and multi-line product items
- Status flow: Draft → Waiting → Ready → Done
- **Validate** action atomically increases stock and creates ledger entries

### 🚚 Delivery Orders (Outgoing Goods)
- Customer-linked delivery orders
- **Insufficient stock protection** – Validation fails if not enough stock at source location
- Automatic stock decrease on validation

### 🔄 Internal Transfers
- Move stock between any two locations (e.g., Warehouse → Production Floor)
- **Dual ledger entries** – transfer_out from source, transfer_in at destination
- Total stock unchanged, only locations update

### 📋 Stock Adjustments
- Reconcile recorded vs physical count
- System auto-calculates difference and updates stock
- Reason field for audit compliance

### 📒 Stock Ledger
- Complete movement history with operation type icons and color coding
- Filterable by operation type and product
- Paginated view with timestamp display
- Positive/negative quantity change indicators

### 🏭 Warehouse Management
- Multi-warehouse support with named locations
- Location types: Shelf, Receiving Bay, Shipping Zone, Production Floor, Storage

### 👤 Profile Management
- View/edit user profile
- Role display and member-since date

---

## 🚀 Quick Setup

### Prerequisites
- **Node.js** 18+ installed
- **npm** (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd Code-Inventory-Token-Limit

# Install all dependencies (server + client)
npm install
cd client && npm install && cd ..

# Seed demo data
npm run seed

# Start both servers (backend + frontend)
npm run dev
```

### Access
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api if the port 5173 is not available then check the terminal for the correct port
- **Demo Login**: `admin@coreinventory.com` / `admin123`

---

## 🎬 Demo Workflow

### Step 1: Create a Product
→ Products → Add Product → "Steel Rods" (SKU: STL-001, Category: Raw Materials)

### Step 2: Receive Inventory
→ Receipts → New Receipt → Select supplier "SteelMax" → Add 100 kg Steel Rods → **Validate**
Stock: +100

### Step 3: Internal Transfer
→ Transfers → New Transfer → Main Warehouse Rack A → Production Floor → 30 kg Steel Rods → **Validate**
Stock location changes, total unchanged

### Step 4: Deliver to Customer
→ Deliveries → New Delivery → Customer "BuildCorp" → 20 kg Steel Rods from Rack A → **Validate**
Stock: -20

### Step 5: View Ledger
→ Move History → See complete audit trail with all operations logged

### Step 6: Dashboard
→ Dashboard → Updated KPIs reflect all changes in real-time

---

## 📖 Demo Data (Pre-seeded)

| Category | Products | Examples |
|----------|----------|---------|
| Raw Materials | 3 | Steel Rods, Copper Wire, Aluminum Sheet |
| Electronics | 3 | LED Display Panel, Circuit Board v2, Wireless Mouse |
| Furniture | 2 | Office Chair, Standing Desk |
| Packaging | 2 | Cardboard Box, Bubble Wrap Roll |

**2 Warehouses**: Main Warehouse (5 locations), East Hub (2 locations)
**3 Suppliers**: SteelMax Industries, TechParts Global, PackRight Solutions
**2 Customers**: BuildCorp Ltd, SmartOffice Inc

---

## 🔮 Future Improvements

1. **Barcode/QR Scanner** – Scan products for instant stock operations
2. **Role-Based Access Control** – Admin, Manager, Operator permission levels
3. **Purchase Orders** – Automated PO generation when stock falls below reorder level
4. **Reports & Analytics** – Export reports, ABC analysis, demand forecasting
5. **Batch/Lot Tracking** – Track inventory by manufacturing batch
6. **Mobile PWA** – Offline-capable mobile app for warehouse floor use
7. **Real-time WebSocket Updates** – Live dashboard updates across clients
8. **Image Upload** – Product images and document attachments
9. **Email Notifications** – Automated alerts for low stock and pending operations
10. **Multi-tenant Support** – SaaS architecture for multiple businesses

---

## 📁 Project Structure

```
├── server/               # Express.js Backend
│   ├── index.js          # Server entry point
│   ├── db.js             # SQLite schema & connection
│   ├── seed.js           # Demo data seeder
│   ├── middleware/
│   │   └── auth.js       # JWT middleware
│   └── routes/
│       ├── auth.js       # Authentication endpoints
│       ├── products.js   # Product CRUD
│       ├── warehouses.js # Warehouses, locations, suppliers, customers
│       ├── receipts.js   # Incoming goods management
│       ├── deliveries.js # Outgoing goods management
│       ├── transfers.js  # Internal stock transfers
│       ├── adjustments.js # Stock reconciliation
│       ├── ledger.js     # Stock movement history
│       └── dashboard.js  # Analytics KPIs
├── client/               # React 18 + Vite Frontend
│   └── src/
│       ├── App.jsx       # Router & route guards
│       ├── index.css     # Design system (CSS variables)
│       ├── context/      # Auth state management
│       ├── components/   # Sidebar, Layout
│       ├── pages/        # All 12 page components
│       └── utils/        # API client
├── data/                 # SQLite database (auto-created)
├── package.json
└── README.md
```

---

## 📄 License

MIT License – Built for [Hackathon Name] 2025

---

**Built with ❤️ by the CoreInventory Team**
