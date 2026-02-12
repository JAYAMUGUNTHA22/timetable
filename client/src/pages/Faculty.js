import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { facultyApi, departmentsApi } from '../services/api';
import './Faculty.css';

function Faculty() {
  const [list, setList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    facultyId: '', name: '', homeDepartment: '', maxPeriodsPerDay: 6, maxPeriodsPerWeek: 30
  });
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    facultyApi.getAll().then(setList).catch(() => setList([]));
    departmentsApi.getAll().then(setDepartments).catch(() => setDepartments([]));
  };

  useEffect(() => {
    load();
    setLoading(false);
  }, []);

  useEffect(() => {
    if (modal) departmentsApi.getAll().then(setDepartments).catch(() => {});
  }, [modal]);

  const openCreate = (departmentId) => {
    setForm({
      facultyId: '', name: '', homeDepartment: departmentId || '',
      maxPeriodsPerDay: 6, maxPeriodsPerWeek: 30
    });
    setModal('create');
    setMessage(null);
  };

  const openEdit = (f) => {
    setForm({
      id: f._id,
      facultyId: f.facultyId,
      name: f.name,
      homeDepartment: f.homeDepartment?._id || f.homeDepartment || '',
      maxPeriodsPerDay: f.maxPeriodsPerDay ?? 6,
      maxPeriodsPerWeek: f.maxPeriodsPerWeek ?? 30
    });
    setModal('edit');
    setMessage(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage(null);
    const payload = {
      facultyId: form.facultyId,
      name: form.name,
      homeDepartment: form.homeDepartment,
      maxPeriodsPerDay: Number(form.maxPeriodsPerDay) || 6,
      maxPeriodsPerWeek: Number(form.maxPeriodsPerWeek) || 30
    };
    if (modal === 'create') {
      facultyApi.create(payload)
        .then(() => { setModal(null); load(); setMessage({ type: 'success', text: 'Faculty created.' }); })
        .catch((err) => setMessage({ type: 'error', text: err.message }));
    } else {
      facultyApi.update(form.id, payload)
        .then(() => { setModal(null); load(); setMessage({ type: 'success', text: 'Faculty updated.' }); })
        .catch((err) => setMessage({ type: 'error', text: err.message }));
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this faculty?')) return;
    facultyApi.delete(id).then(() => load()).catch((err) => setMessage({ type: 'error', text: err.message }));
  };

  const getFacultyByDepartment = (deptId) => {
    if (!deptId) return [];
    return list.filter((f) => (f.homeDepartment?._id || f.homeDepartment) === deptId);
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="faculty-page">
      <div className="page-header">
        <button type="button" className="btn btn-secondary btn-sm back-btn" onClick={() => navigate('/')}>← Back</button>
        <h1>Faculty</h1>
      </div>
      {message && <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>{message.text}</div>}

      {departments.length === 0 ? (
        <div className="card empty-state"><p>No departments yet. Add departments first.</p></div>
      ) : (
        <div className="dept-grid">
          {departments.map((dept) => {
            const deptFaculty = getFacultyByDepartment(dept._id);
            return (
              <div key={dept._id} className="dept-card card">
                <div className="dept-card-header">
                  <h2>{dept.name} ({dept.departmentId})</h2>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => openCreate(dept._id)}>
                    Add Faculty
                  </button>
                </div>
                <div className="table-wrap">
                  {deptFaculty.length === 0 ? (
                    <p className="empty-dept">No faculty in this department. Click Add Faculty above.</p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Max/Day</th>
                          <th>Max/Week</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptFaculty.map((f) => (
                          <tr key={f._id}>
                            <td>{f.facultyId}</td>
                            <td>{f.name}</td>
                            <td>{f.maxPeriodsPerDay}</td>
                            <td>{f.maxPeriodsPerWeek}</td>
                            <td>
                              <button type="button" className="btn btn-sm btn-secondary" onClick={() => openEdit(f)}>Edit</button>
                              <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(f._id)}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal modal-lg card" onClick={(e) => e.stopPropagation()}>
            <h2>{modal === 'create' ? 'Add Faculty' : 'Edit Faculty'}</h2>
            {message && <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>{message.text}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Faculty ID</label>
                  <input
                    required
                    value={form.facultyId}
                    onChange={(e) => setForm(prev => ({ ...prev, facultyId: e.target.value }))}
                    placeholder="e.g. F001"
                    disabled={modal === 'edit'}
                  />
                </div>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Home Department</label>
                <select
                  required
                  value={form.homeDepartment}
                  onChange={(e) => setForm(prev => ({ ...prev, homeDepartment: e.target.value }))}
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name} ({d.departmentId})</option>
                  ))}
                </select>
              </div>
              <p className="form-hint">Subjects are assigned to faculty on the <strong>Subjects</strong> page when you add or edit a subject.</p>
              <div className="form-row">
                <div className="form-group">
                  <label>Max periods per day</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={form.maxPeriodsPerDay}
                    onChange={(e) => setForm(prev => ({ ...prev, maxPeriodsPerDay: Number(e.target.value) || 6 }))}
                  />
                </div>
                <div className="form-group">
                  <label>Max periods per week</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={form.maxPeriodsPerWeek}
                    onChange={(e) => setForm(prev => ({ ...prev, maxPeriodsPerWeek: Number(e.target.value) || 30 }))}
                  />
                </div>
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

export default Faculty;
