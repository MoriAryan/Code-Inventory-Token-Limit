import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, ArrowDownToLine, Truck, ArrowLeftRight,
  ClipboardCheck, ScrollText, Warehouse, User, LogOut, Settings
} from 'lucide-react';

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { section: 'Overview', links: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ]},
    { section: 'Inventory', links: [
      { to: '/products', icon: Package, label: 'Products' },
    ]},
    { section: 'Operations', links: [
      { to: '/receipts', icon: ArrowDownToLine, label: 'Receipts' },
      { to: '/deliveries', icon: Truck, label: 'Delivery Orders' },
      { to: '/transfers', icon: ArrowLeftRight, label: 'Internal Transfers' },
      { to: '/adjustments', icon: ClipboardCheck, label: 'Adjustments' },
      { to: '/ledger', icon: ScrollText, label: 'Move History' },
    ]},
    { section: 'Settings', links: [
      { to: '/warehouses', icon: Warehouse, label: 'Warehouses' },
    ]},
  ];

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">CI</div>
        <div>
          <div className="sidebar-title">CoreInventory</div>
          <div className="sidebar-subtitle">Warehouse IMS</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div className="nav-section" key={section.section}>
            <div className="nav-section-title">{section.section}</div>
            {section.links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <link.icon />
                {link.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink
          to="/profile"
          className={({ isActive }) => `sidebar-user ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || 'User'}</div>
            <div className="sidebar-user-email">{user?.email || ''}</div>
          </div>
        </NavLink>
        <button className="nav-link" onClick={handleLogout} style={{ marginTop: 4 }}>
          <LogOut />
          Logout
        </button>
      </div>
    </aside>
  );
}
