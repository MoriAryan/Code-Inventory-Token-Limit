import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, X, Warehouse as WarehouseIcon, MapPin } from 'lucide-react';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddWH, setShowAddWH] = useState(false);
  const [showAddLoc, setShowAddLoc] = useState(null); // warehouse_id
  const [locations, setLocations] = useState({});
  const [error, setError] = useState('');
  const [whForm, setWhForm] = useState({ name: '', address: '' });
  const [locForm, setLocForm] = useState({ name: '', type: 'shelf' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const whs = await api.getWarehouses();
      setWarehouses(whs);
      const locs = {};
      for (const wh of whs) {
        locs[wh.id] = await api.getLocations(wh.id);
      }
      setLocations(locs);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleAddWH = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createWarehouse(whForm);
      setShowAddWH(false);
      setWhForm({ name: '', address: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleAddLoc = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createLocation({ warehouse_id: showAddLoc, ...locForm });
      setShowAddLoc(null);
      setLocForm({ name: '', type: 'shelf' });
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div className="spinner"><div className="spinner-circle"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Warehouses & Locations</h1>
          <div className="page-header-subtitle">Manage storage facilities</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setShowAddWH(true); setError(''); }}>
            <Plus size={16} /> Add Warehouse
          </button>
        </div>
      </div>

      {warehouses.length === 0 ? (
        <div className="card empty-state"><WarehouseIcon size={48} /><h3>No warehouses</h3><p>Create your first warehouse</p></div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {warehouses.map(wh => (
            <div key={wh.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <WarehouseIcon size={20} style={{ color: 'var(--accent)' }} />
                    {wh.name}
                  </h3>
                  {wh.address && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{wh.address}</div>}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowAddLoc(wh.id); setError(''); }}>
                  <Plus size={14} /> Add Location
                </button>
              </div>
              {locations[wh.id]?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {locations[wh.id].map(loc => (
                    <div key={loc.id} style={{
                      padding: '8px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13
                    }}>
                      <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontWeight: 500 }}>{loc.name}</span>
                      <span className="badge badge-draft" style={{ fontSize: 10 }}>{loc.type}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No locations configured</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Warehouse Modal */}
      {showAddWH && (
        <div className="modal-overlay" onClick={() => setShowAddWH(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>New Warehouse</h2><button className="modal-close" onClick={() => setShowAddWH(false)}><X size={16} /></button></div>
            <form onSubmit={handleAddWH}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" value={whForm.name} onChange={e => setWhForm({...whForm, name: e.target.value})} required placeholder="e.g. Main Warehouse" />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-input" value={whForm.address} onChange={e => setWhForm({...whForm, address: e.target.value})} placeholder="Optional" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddWH(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Warehouse</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showAddLoc && (
        <div className="modal-overlay" onClick={() => setShowAddLoc(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>New Location</h2><button className="modal-close" onClick={() => setShowAddLoc(null)}><X size={16} /></button></div>
            <form onSubmit={handleAddLoc}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Location Name *</label>
                  <input className="form-input" value={locForm.name} onChange={e => setLocForm({...locForm, name: e.target.value})} required placeholder="e.g. Rack C" />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={locForm.type} onChange={e => setLocForm({...locForm, type: e.target.value})}>
                    <option value="shelf">Shelf / Rack</option>
                    <option value="receiving">Receiving Bay</option>
                    <option value="shipping">Shipping Zone</option>
                    <option value="production">Production Floor</option>
                    <option value="storage">Storage</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddLoc(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Location</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
