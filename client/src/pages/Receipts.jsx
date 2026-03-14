import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, X, ArrowDownToLine, CheckCircle, Eye } from 'lucide-react';

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ supplier_id: '', location_id: '', notes: '', lines: [{ product_id: '', quantity: '' }] });

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => {
    api.getSuppliers().then(setSuppliers).catch(console.error);
    api.getAllLocations().then(setLocations).catch(console.error);
    api.getProducts().then(setProducts).catch(console.error);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `status=${statusFilter}` : '';
      setReceipts(await api.getReceipts(params));
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
        supplier_id: form.supplier_id || null,
        location_id: Number(form.location_id),
        notes: form.notes,
        lines: form.lines.filter(l => l.product_id && l.quantity).map(l => ({
          product_id: Number(l.product_id), quantity: Number(l.quantity)
        }))
      };
      if (!body.location_id) throw new Error('Select a location');
      if (!body.lines.length) throw new Error('Add at least one product');
      await api.createReceipt(body);
      setShowCreate(false);
      setForm({ supplier_id: '', location_id: '', notes: '', lines: [{ product_id: '', quantity: '' }] });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleValidate = async (id) => {
    if (!confirm('Validate this receipt? Stock will be updated.')) return;
    try {
      await api.validateReceipt(id);
      load();
      if (showDetail?.id === id) viewDetail(id);
    } catch (err) { alert(err.message); }
  };

  const viewDetail = async (id) => {
    try { setShowDetail(await api.getReceipt(id)); } catch (err) { console.error(err); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Receipts</h1>
          <div className="page-header-subtitle">Incoming goods from suppliers</div>
        </div>
        <div className="page-actions">
          <button id="create-receipt-btn" className="btn btn-primary" onClick={() => { setShowCreate(true); setError(''); }}>
            <Plus size={16} /> New Receipt
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
      ) : receipts.length === 0 ? (
        <div className="card empty-state">
          <ArrowDownToLine size={48} />
          <h3>No receipts found</h3>
          <p>Create a receipt to record incoming goods</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Reference</th><th>Supplier</th><th>Location</th><th>Status</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {receipts.map(r => (
                <tr key={r.id}>
                  <td><code style={{ fontWeight: 600, fontSize: 12 }}>{r.reference}</code></td>
                  <td>{r.supplier_name || '—'}</td>
                  <td>{r.location_name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({r.warehouse_name})</span></td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => viewDetail(r.id)}><Eye size={14} /></button>
                      {r.status !== 'done' && r.status !== 'cancelled' && (
                        <button className="btn btn-success btn-sm" onClick={() => handleValidate(r.id)}><CheckCircle size={14} /> Validate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Receipt</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Supplier</label>
                    <select className="form-select" value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value})}>
                      <option value="">Select supplier...</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Destination Location *</label>
                    <select className="form-select" value={form.location_id} onChange={e => setForm({...form, location_id: e.target.value})} required>
                      <option value="">Select location...</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} → {l.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional notes..." />
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
                      <button type="button" className="remove-line" onClick={() => removeLine(i)} disabled={form.lines.length === 1}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addLine} style={{ marginTop: 4 }}>
                    <Plus size={14} /> Add Line
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{showDetail.reference}</h2>
              <button className="modal-close" onClick={() => setShowDetail(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div><span className="form-label">Supplier</span><div>{showDetail.supplier_name || '—'}</div></div>
                <div><span className="form-label">Location</span><div>{showDetail.location_name} ({showDetail.warehouse_name})</div></div>
              </div>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div><span className="form-label">Status</span><div><span className={`badge badge-${showDetail.status}`}>{showDetail.status}</span></div></div>
                <div><span className="form-label">Created</span><div>{new Date(showDetail.created_at).toLocaleString()}</div></div>
              </div>
              {showDetail.notes && <div style={{ marginBottom: 16 }}><span className="form-label">Notes</span><div>{showDetail.notes}</div></div>}
              <span className="form-label">Products</span>
              <div className="table-container" style={{ marginTop: 8 }}>
                <table className="data-table">
                  <thead><tr><th>Product</th><th>SKU</th><th>Quantity</th></tr></thead>
                  <tbody>
                    {showDetail.lines?.map(l => (
                      <tr key={l.id}><td style={{ fontWeight: 600 }}>{l.product_name}</td><td><code>{l.sku}</code></td><td>{l.quantity}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {showDetail.status !== 'done' && showDetail.status !== 'cancelled' && (
              <div className="modal-footer">
                <button className="btn btn-success" onClick={() => handleValidate(showDetail.id)}>
                  <CheckCircle size={16} /> Validate Receipt
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
