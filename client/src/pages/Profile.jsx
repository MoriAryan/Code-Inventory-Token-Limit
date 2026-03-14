import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { User, Mail, Shield, Calendar } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const updated = await api.updateProfile(form);
      updateUser(updated);
      setEditing(false);
      setSuccess('Profile updated');
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>My Profile</h1>
      </div>

      <div className="card profile-card">
        <div className="profile-avatar-lg">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
        {success && <div className="alert alert-success">{success}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {editing ? (
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary">Save Changes</button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <User size={18} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Name</div>
                  <div style={{ fontWeight: 600 }}>{user?.name}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Mail size={18} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Email</div>
                  <div>{user?.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Shield size={18} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Role</div>
                  <div style={{ textTransform: 'capitalize' }}>{user?.role}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Member Since</div>
                  <div>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</div>
                </div>
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => { setEditing(true); setSuccess(''); }}>Edit Profile</button>
          </div>
        )}
      </div>
    </div>
  );
}
