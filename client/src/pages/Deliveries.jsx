import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, X, Truck, CheckCircle, Eye } from 'lucide-react';

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ customer_id: '', location_id: '', notes: '', lines: [{ product_id: '', quantity: '' }] });

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => {
    api.getCustomers().then(setCustomers).catch(console.error);
    api.getAllLocations().then(setLocations).catch(console.error);
    api.getProducts().then(setProducts).catch(console.error);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `status=${statusFilter}` : '';
      setDeliveries(await api.getDeliveries(params));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const addLine = () => setForm({ ...form, lines: [...form.lines, { product_id: '', quantity: '' }] });
  const removeLine = (i) => setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) });
  const updateLine = (i, field, val) => {
    const lines = [...form.lines];
    lines[i] = { ...lines[i], [field]: val };
    setForm({ ...form, lines });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = {
        customer_id: form.customer_id || null,
        location_id: Number(form.location_id),
        notes: form.notes,
        lines: form.lines.filter(l => l.product_id && l.quantity).map(l => ({
          product_id: Number(l.product_id), quantity: Number(l.quantity)
        }))
      };
      if (!body.location_id) throw new Error('Select a source location');
      if (!body.lines.length) throw new Error('Add at least one product');
      await api.createDelivery(body);
      setShowCreate(false);
      setForm({ customer_id: '', location_id: '', notes: '', lines: [{ product_id: '', quantity: '' }] });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleValidate = async (id) => {
    if (!confirm('Validate this delivery? Stock will be decreased.')) return;
    try {
      await api.validateDelivery(id);
      load();
      if (showDetail?.id === id) viewDetail(id);
    } catch (err) { alert(err.message); }
  };

  const viewDetail = async (id) => {
    try { setShowDetail(await api.getDelivery(id)); } catch (err) { console.error(err); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Delivery Orders</h1>
          <div className="page-header-subtitle">Outgoing shipments to customers</div>
        </div>
        <div className="page-actions">
          <button id="create-delivery-btn" className="btn btn-primary" onClick={() => { setShowCreate(true); setError(''); }}>
            <Plus size={16} /> New Delivery
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="waiting">Waiting</option>
          <option value="ready">Ready</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="spinner"><div className="spinner-circle"></div></div>
      ) : deliveries.length === 0 ? (
        <div className="card empty-state"><Truck size={48} /><h3>No deliveries found</h3><p>Create a delivery to ship goods to customers</p></div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Reference</th><th>Customer</th><th>Source</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id}>
                  <td><code style={{ fontWeight: 600, fontSize: 12 }}>{d.reference}</code></td>
                  <td>{d.customer_name || '—'}</td>
                  <td>{d.location_name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({d.warehouse_name})</span></td>
                  <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(d.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => viewDetail(d.id)}><Eye size={14} /></button>
                      {d.status !== 'done' && d.status !== 'cancelled' && (
                        <button className="btn btn-success btn-sm" onClick={() => handleValidate(d.id)}><CheckCircle size={14} /> Validate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>New Delivery Order</h2><button className="modal-close" onClick={() => setShowCreate(false)}><X size={16} /></button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Customer</label>
                    <select className="form-select" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})}>
                      <option value="">Select customer...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Source Location *</label>
                    <select className="form-select" value={form.location_id} onChange={e => setForm({...form, location_id: e.target.value})} required>
                      <option value="">Select location...</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} → {l.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional..." />
                </div>
                <label className="form-label">Products</label>
                <div className="line-items">
                  <div className="line-item-header"><span>Product</span><span>Quantity</span><span></span></div>
                  {form.lines.map((line, i) => (
                    <div className="line-item" key={i}>
                      <select className="form-select" value={line.product_id} onChange={e => updateLine(i, 'product_id', e.target.value)}>
                        <option value="">Select...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Stock: {p.total_stock}</option>)}
                      </select>
                      <input type="number" className="form-input" placeholder="Qty" min="0.01" step="any"
                        value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                      <button type="button" className="remove-line" onClick={() => removeLine(i)} disabled={form.lines.length === 1}><X size={14} /></button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addLine} style={{ marginTop: 4 }}><Plus size={14} /> Add Line</button>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Delivery</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{showDetail.reference}</h2><button className="modal-close" onClick={() => setShowDetail(null)}><X size={16} /></button></div>
            <div className="modal-body">
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div><span className="form-label">Customer</span><div>{showDetail.customer_name || '—'}</div></div>
                <div><span className="form-label">Source Location</span><div>{showDetail.location_name} ({showDetail.warehouse_name})</div></div>
              </div>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div><span className="form-label">Status</span><div><span className={`badge badge-${showDetail.status}`}>{showDetail.status}</span></div></div>
                <div><span className="form-label">Created</span><div>{new Date(showDetail.created_at).toLocaleString()}</div></div>
              </div>
              <span className="form-label">Products</span>
              <div className="table-container" style={{ marginTop: 8 }}>
                <table className="data-table"><thead><tr><th>Product</th><th>SKU</th><th>Quantity</th></tr></thead>
                  <tbody>{showDetail.lines?.map(l => (
                    <tr key={l.id}><td style={{ fontWeight: 600 }}>{l.product_name}</td><td><code>{l.sku}</code></td><td>{l.quantity}</td></tr>
                  ))}</tbody></table>
              </div>
            </div>
            {showDetail.status !== 'done' && showDetail.status !== 'cancelled' && (
              <div className="modal-footer"><button className="btn btn-success" onClick={() => handleValidate(showDetail.id)}><CheckCircle size={16} /> Validate Delivery</button></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
