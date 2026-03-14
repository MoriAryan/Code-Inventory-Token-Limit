import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import {
  Package, AlertTriangle, ArrowDownToLine, Truck, ArrowLeftRight,
  TrendingUp, Box, PackageOpen
} from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const d = await api.getDashboard();
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="spinner"><div className="spinner-circle"></div></div>;
  if (!data) return <div className="alert alert-error">Failed to load dashboard</div>;

  const { kpis, lowStockItems, recentOperations } = data;

  const kpiCards = [
    { label: 'Total Products', value: kpis.totalProducts, icon: Package, color: 'var(--accent)', bg: 'var(--accent-soft)' },
    { label: 'Total Stock', value: Math.round(kpis.totalStock), icon: Box, color: 'var(--success)', bg: 'var(--success-soft)' },
    { label: 'Low Stock Alerts', value: kpis.lowStockCount, icon: AlertTriangle, color: 'var(--warning)', bg: 'var(--warning-soft)', onClick: () => navigate('/products?low_stock=true') },
    { label: 'Out of Stock', value: kpis.outOfStockCount, icon: PackageOpen, color: 'var(--danger)', bg: 'var(--danger-soft)' },
    { label: 'Pending Receipts', value: kpis.pendingReceipts, icon: ArrowDownToLine, color: 'var(--success)', bg: 'var(--success-soft)', onClick: () => navigate('/receipts') },
    { label: 'Pending Deliveries', value: kpis.pendingDeliveries, icon: Truck, color: 'var(--info)', bg: 'var(--info-soft)', onClick: () => navigate('/deliveries') },
    { label: 'Pending Transfers', value: kpis.pendingTransfers, icon: ArrowLeftRight, color: 'var(--cyan)', bg: 'var(--cyan-soft)', onClick: () => navigate('/transfers') },
  ];

  const getStatusBadge = (status) => <span className={`badge badge-${status}`}>{status}</span>;
  const getTypeBadge = (type) => <span className={`badge badge-${type}`}>{type}</span>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div className="page-header-subtitle">Real-time inventory overview</div>
        </div>
      </div>

      <div className="card-grid">
        {kpiCards.map(kpi => (
          <div key={kpi.label} className="card kpi-card" style={{ '--kpi-color': kpi.color, cursor: kpi.onClick ? 'pointer' : 'default' }}
            onClick={kpi.onClick}>
            <div className="kpi-icon" style={{ background: kpi.bg, color: kpi.color }}>
              <kpi.icon />
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
        {/* Low Stock Items */}
        <div className="card" style={{ gridColumn: lowStockItems.length === 0 ? 'span 1' : 'span 1' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} /> Low Stock Alerts
          </h3>
          {lowStockItems.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <p>All products are well-stocked!</p>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Product</th><th>Stock</th><th>Reorder Level</th></tr>
                </thead>
                <tbody>
                  {lowStockItems.slice(0, 8).map(item => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.sku}</div>
                      </td>
                      <td>
                        <span style={{ color: item.total_stock === 0 ? 'var(--danger)' : 'var(--warning)', fontWeight: 700 }}>
                          {item.total_stock}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{item.reorder_level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Operations */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} style={{ color: 'var(--accent)' }} /> Recent Operations
          </h3>
          {recentOperations.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <p>No operations yet</p>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Reference</th><th>Type</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {recentOperations.map((op, i) => (
                    <tr key={i} style={{ cursor: 'pointer' }} onClick={() => navigate(`/${op.type === 'receipt' ? 'receipts' : op.type === 'delivery' ? 'deliveries' : 'transfers'}`)}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{op.reference}</td>
                      <td>{getTypeBadge(op.type)}</td>
                      <td>{getStatusBadge(op.status)}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {new Date(op.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
