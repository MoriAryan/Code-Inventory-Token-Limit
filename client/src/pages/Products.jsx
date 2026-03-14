import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, Search, Package, X, Edit2, Trash2 } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', sku: '', category_id: '', unit_of_measure: 'unit', reorder_level: 10 });

  useEffect(() => { load(); loadCategories(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (catFilter) params.set('category_id', catFilter);
      const data = await api.getProducts(params.toString());
      setProducts(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const loadCategories = async () => {
    try { setCategories(await api.getCategories()); } catch (err) { console.error(err); }
  };

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search, catFilter]);

  const openCreate = () => {
    setEditProduct(null);
    setForm({ name: '', sku: '', category_id: '', unit_of_measure: 'unit', reorder_level: 10 });
    setError('');
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditProduct(p);
    setForm({ name: p.name, sku: p.sku, category_id: p.category_id || '', unit_of_measure: p.unit_of_measure, reorder_level: p.reorder_level });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { ...form, category_id: form.category_id || null, reorder_level: Number(form.reorder_level) };
      if (editProduct) {
        await api.updateProduct(editProduct.id, body);
      } else {
        await api.createProduct(body);
      }
      setShowModal(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try { await api.deleteProduct(id); load(); } catch (err) { alert(err.message); }
  };

  const getStockStatus = (stock, reorder) => {
    if (stock === 0) return 'stock-low';
    if (stock <= reorder) return 'stock-warning';
    return 'stock-ok';
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <div className="page-header-subtitle">{products.length} products in catalog</div>
        </div>
        <div className="page-actions">
          <button id="create-product-btn" className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Product</button>
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
          <input id="product-search" className="form-input search-input" placeholder="Search by name or SKU..."
            style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="spinner"><div className="spinner-circle"></div></div>
      ) : products.length === 0 ? (
        <div className="card empty-state">
          <Package size={48} />
          <h3>No products found</h3>
          <p>Create your first product to get started</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Category</th><th>UoM</th><th>Stock Level</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td><code style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.sku}</code></td>
                  <td>{p.category_name || '—'}</td>
                  <td>{p.unit_of_measure}</td>
                  <td>
                    <div className={`stock-bar ${getStockStatus(p.total_stock, p.reorder_level)}`}>
                      <div className="stock-bar-track">
                        <div className="stock-bar-fill" style={{ width: `${Math.min((p.total_stock / Math.max(p.reorder_level * 3, 1)) * 100, 100)}%` }}></div>
                      </div>
                      <span className="stock-qty">{p.total_stock}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><Edit2 size={14} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editProduct ? 'Edit Product' : 'New Product'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Product Name *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SKU *</label>
                    <input className="form-input" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                      <option value="">None</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit of Measure</label>
                    <select className="form-select" value={form.unit_of_measure} onChange={e => setForm({...form, unit_of_measure: e.target.value})}>
                      <option value="unit">Unit</option>
                      <option value="kg">Kg</option>
                      <option value="meter">Meter</option>
                      <option value="liter">Liter</option>
                      <option value="roll">Roll</option>
                      <option value="box">Box</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Reorder Level</label>
                  <input type="number" className="form-input" value={form.reorder_level}
                    onChange={e => setForm({...form, reorder_level: e.target.value})} min="0" />
                  <div className="form-hint">Alert when stock falls below this level</div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editProduct ? 'Update' : 'Create'} Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
