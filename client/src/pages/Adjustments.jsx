import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, X, ClipboardCheck } from 'lucide-react';

export default function Adjustments() {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ product_id: '', location_id: '', actual_qty: '', reason: '' });

  useEffect(() => { load(); }, []);
  useEffect(() => {
    api.getAllLocations().then(setLocations).catch(console.error);
    api.getProducts().then(setProducts).catch(console.error);
  }, []);

  const load = async () => {
    setLoading(true);
    try { setAdjustments(await api.getAdjustments()); } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = {
        product_id: Number(form.product_id),
        location_id: Number(form.location_id),
        actual_qty: Number(form.actual_qty),
        reason: form.reason
      };
      if (!body.product_id || !body.location_id) throw new Error('Select product and location');
      if (body.actual_qty < 0) throw new Error('Quantity cannot be negative');
      await api.createAdjustment(body);
      setShowCreate(false);
      setForm({ product_id: '', location_id: '', actual_qty: '', reason: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Stock Adjustments</h1>
          <div className="page-header-subtitle">Reconcile recorded vs physical stock</div>
        </div>
        <div className="page-actions">
          <button id="create-adjustment-btn" className="btn btn-primary" onClick={() => { setShowCreate(true); setError(''); }}>
            <Plus size={16} /> New Adjustment
          </button>
        </div>
      </div>

      {loading ? (
        <div className="spinner"><div className="spinner-circle"></div></div>
      ) : adjustments.length === 0 ? (
        <div className="card empty-state"><ClipboardCheck size={48} /><h3>No adjustments</h3><p>Create an adjustment when physical count differs from system stock</p></div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Reference</th><th>Product</th><th>Location</th><th>Recorded</th><th>Actual</th><th>Difference</th><th>Reason</th><th>Date</th></tr></thead>
            <tbody>
              {adjustments.map(a => (
                <tr key={a.id}>
                  <td><code style={{ fontSize: 12, fontWeight: 600 }}>{a.reference}</code></td>
                  <td style={{ fontWeight: 600 }}>{a.product_name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({a.sku})</span></td>
                  <td>{a.location_name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({a.warehouse_name})</span></td>
                  <td>{a.recorded_qty}</td>
                  <td>{a.actual_qty}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: a.difference > 0 ? 'var(--success)' : a.difference < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {a.difference > 0 ? '+' : ''}{a.difference}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(a.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>New Stock Adjustment</h2><button className="modal-close" onClick={() => setShowCreate(false)}><X size={16} /></button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Product *</label>
                  <select className="form-select" value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})} required>
                    <option value="">Select product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <select className="form-select" value={form.location_id} onChange={e => setForm({...form, location_id: e.target.value})} required>
                    <option value="">Select location...</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} → {l.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Actual Counted Quantity *</label>
                  <input type="number" className="form-input" min="0" step="any" value={form.actual_qty}
                    onChange={e => setForm({...form, actual_qty: e.target.value})} required placeholder="Physical count..." />
                  <div className="form-hint">System will calculate difference and update stock</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <textarea className="form-textarea" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="e.g. Damaged items, counting error..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
