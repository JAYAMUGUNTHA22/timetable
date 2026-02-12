import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { departmentsApi } from '../services/api';
import './Departments.css';

function Departments() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ departmentId: '', name: '', sectionsCount: 1 });
  const [message, setMessage] = useState(null);

  const load = () => departmentsApi.getAll().then(setList).catch(() => setList([]));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setForm({ departmentId: '', name: '', sectionsCount: 1 });
    setModal('create');
    setMessage(null);
  };

  const openEdit = (d) => {
    setForm({
      id: d._id,
      departmentId: d.departmentId,
      name: d.name,
      sectionsCount: d.sectionsCount
    });
    setModal('edit');
    setMessage(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage(null);
    if (modal === 'create') {
      departmentsApi.create({ departmentId: form.departmentId, name: form.name, sectionsCount: form.sectionsCount })
        .then(() => { setModal(null); load(); setMessage({ type: 'success', text: 'Department created.' }); })
        .catch((err) => setMessage({ type: 'error', text: err.message }));
    } else {
      departmentsApi.update(form.id, { departmentId: form.departmentId, name: form.name, sectionsCount: form.sectionsCount })
        .then(() => { setModal(null); load(); setMessage({ type: 'success', text: 'Department updated.' }); })
        .catch((err) => setMessage({ type: 'error', text: err.message }));
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this department?')) return;
    departmentsApi.delete(id).then(() => load()).catch((err) => setMessage({ type: 'error', text: err.message }));
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="departments-page">
      <div className="page-header">
        <button type="button" className="btn btn-secondary btn-sm back-btn" onClick={() => navigate('/')}>← Back</button>
        <h1>Departments</h1>
        <button type="button" className="btn btn-primary" onClick={openCreate}>Add Department</button>
      </div>
      {message && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>{message.text}</div>
      )}
      <div className="table-wrap card">
        {list.length === 0 ? (
          <div className="empty-state">
            <p>No departments yet. Add one to get started.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Department ID</th>
                <th>Name</th>
                <th>Sections</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d._id}>
                  <td>{d.departmentId}</td>
                  <td>{d.name}</td>
                  <td>{d.sectionsCount}</td>
                  <td>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => openEdit(d)}>Edit</button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(d._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h2>{modal === 'create' ? 'Add Department' : 'Edit Department'}</h2>
            {message && <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>{message.text}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Department ID</label>
                <input
                  required
                  value={form.departmentId}
                  onChange={(e) => setForm(prev => ({ ...prev, departmentId: e.target.value }))}
                  placeholder="e.g. CSE"
                  disabled={modal === 'edit'}
                />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Computer Science"
                />
              </div>
              <div className="form-group">
                <label>Sections per department</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.sectionsCount}
                  onChange={(e) => setForm(prev => ({ ...prev, sectionsCount: Number(e.target.value) || 1 }))}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Departments;
