import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { ScrollText, ArrowDownToLine, Truck, ArrowLeftRight, ClipboardCheck } from 'lucide-react';

const typeIcons = {
  receipt: ArrowDownToLine,
  delivery: Truck,
  transfer_in: ArrowLeftRight,
  transfer_out: ArrowLeftRight,
  adjustment: ClipboardCheck
};

const typeColors = {
  receipt: { bg: 'var(--success-soft)', color: 'var(--success)' },
  delivery: { bg: 'var(--info-soft)', color: 'var(--info)' },
  transfer_in: { bg: 'var(--success-soft)', color: 'var(--success)' },
  transfer_out: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  adjustment: { bg: 'var(--warning-soft)', color: 'var(--warning)' }
};

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [opFilter, setOpFilter] = useState('');
  const [products, setProducts] = useState([]);
  const [productFilter, setProductFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 30;

  useEffect(() => { api.getProducts().then(setProducts).catch(console.error); }, []);
  useEffect(() => { setPage(0); }, [opFilter, productFilter]);
  useEffect(() => { load(); }, [opFilter, productFilter, page]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (opFilter) params.set('operation_type', opFilter);
      if (productFilter) params.set('product_id', productFilter);
      params.set('limit', limit);
      params.set('offset', page * limit);
      const data = await api.getLedger(params.toString());
      setEntries(data.entries);
      setTotal(data.total);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Stock Ledger</h1>
          <div className="page-header-subtitle">{total} total movements</div>
        </div>
      </div>

      <div className="filter-bar">
        <select className="form-select" value={opFilter} onChange={e => setOpFilter(e.target.value)}>
          <option value="">All Operations</option>
          <option value="receipt">Receipts</option>
          <option value="delivery">Deliveries</option>
          <option value="transfer_in">Transfer In</option>
          <option value="transfer_out">Transfer Out</option>
          <option value="adjustment">Adjustments</option>
        </select>
        <select className="form-select" value={productFilter} onChange={e => setProductFilter(e.target.value)}>
          <option value="">All Products</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="spinner"><div className="spinner-circle"></div></div>
      ) : entries.length === 0 ? (
        <div className="card empty-state"><ScrollText size={48} /><h3>No ledger entries</h3><p>Operations will appear here as stock moves</p></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px' }}>
            {entries.map(entry => {
              const Icon = typeIcons[entry.operation_type] || ScrollText;
              const colors = typeColors[entry.operation_type] || { bg: 'var(--bg-card-hover)', color: 'var(--text-muted)' };
              return (
                <div className="ledger-entry" key={entry.id}>
                  <div className="ledger-icon" style={{ background: colors.bg, color: colors.color }}>
                    <Icon />
                  </div>
                  <div className="ledger-info">
                    <div className="ledger-product">{entry.product_name}</div>
                    <div className="ledger-ref">
                      <span className={`badge badge-${entry.operation_type}`}>{entry.operation_type.replace('_', ' ')}</span>
                      {' '}<code style={{ fontSize: 11 }}>{entry.reference}</code>
                      {' '}→ {entry.location_name} ({entry.warehouse_name})
                    </div>
                  </div>
                  <div className={`ledger-qty ${entry.quantity_change > 0 ? 'positive' : 'negative'}`}>
                    {entry.quantity_change > 0 ? '+' : ''}{entry.quantity_change}
                  </div>
                  <div className="ledger-time">{formatTime(entry.created_at)}</div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 12px' }}>Page {page + 1} of {totalPages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
