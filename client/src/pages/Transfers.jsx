import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, X, ArrowLeftRight, CheckCircle, Eye } from 'lucide-react';

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ from_location_id: '', to_location_id: '', notes: '', lines: [{ product_id: '', quantity: '' }] });

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => {
    api.getAllLocations().then(setLocations).catch(console.error);
    api.getProducts().then(setProducts).catch(console.error);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `status=${statusFilter}` : '';
      setTransfers(await api.getTransfers(params));
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
        from_location_id: Number(form.from_location_id),
        to_location_id: Number(form.to_location_id),
        notes: form.notes,
        lines: form.lines.filter(l => l.product_id && l.quantity).map(l => ({
          product_id: Number(l.product_id), quantity: Number(l.quantity)
        }))
      };
      if (!body.from_location_id || !body.to_location_id) throw new Error('Select both source and destination');
      if (body.from_location_id === body.to_location_id) throw new Error('Source and destination must be different');
      if (!body.lines.length) throw new Error('Add at least one product');
      await api.createTransfer(body);
      setShowCreate(false);
      setForm({ from_location_id: '', to_location_id: '', notes: '', lines: [{ product_id: '', quantity: '' }] });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleValidate = async (id) => {
    if (!confirm('Validate this transfer? Stock will be moved between locations.')) return;
    try {
      await api.validateTransfer(id);
      load();
      if (showDetail?.id === id) viewDetail(id);
    } catch (err) { alert(err.message); }
  };

  const viewDetail = async (id) => {
    try { setShowDetail(await api.getTransfer(id)); } catch (err) { console.error(err); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Internal Transfers</h1>
          <div className="page-header-subtitle">Move stock between locations</div>
        </div>
        <div className="page-actions">
          <button id="create-transfer-btn" className="btn btn-primary" onClick={() => { setShowCreate(true); setError(''); }}>
            <Plus size={16} /> New Transfer
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
      ) : transfers.length === 0 ? (
        <div className="card empty-state"><ArrowLeftRight size={48} /><h3>No transfers found</h3><p>Create a transfer to move stock between locations</p></div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Reference</th><th>From</th><th>To</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t.id}>
                  <td><code style={{ fontWeight: 600, fontSize: 12 }}>{t.reference}</code></td>
                  <td>{t.from_location_name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({t.from_warehouse_name})</span></td>
                  <td>{t.to_location_name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({t.to_warehouse_name})</span></td>
                  <td><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => viewDetail(t.id)}><Eye size={14} /></button>
                      {t.status !== 'done' && t.status !== 'cancelled' && (
                        <button className="btn btn-success btn-sm" onClick={() => handleValidate(t.id)}><CheckCircle size={14} /> Validate</button>
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
            <div className="modal-header"><h2>New Internal Transfer</h2><button className="modal-close" onClick={() => setShowCreate(false)}><X size={16} /></button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Source Location *</label>
                    <select className="form-select" value={form.from_location_id} onChange={e => setForm({...form, from_location_id: e.target.value})} required>
                      <option value="">Select source...</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} → {l.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Destination Location *</label>
                    <select className="form-select" value={form.to_location_id} onChange={e => setForm({...form, to_location_id: e.target.value})} required>
                      <option value="">Select destination...</option>
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
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
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
                <button type="submit" className="btn btn-primary">Create Transfer</button>
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
                <div><span className="form-label">From</span><div>{showDetail.from_location_name} ({showDetail.from_warehouse_name})</div></div>
                <div><span className="form-label">To</span><div>{showDetail.to_location_name} ({showDetail.to_warehouse_name})</div></div>
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
              <div className="modal-footer"><button className="btn btn-success" onClick={() => handleValidate(showDetail.id)}><CheckCircle size={16} /> Validate Transfer</button></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
