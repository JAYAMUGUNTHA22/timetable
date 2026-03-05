import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subjectsApi, departmentsApi, facultyApi } from '../services/api';
import './Subjects.css';

function Subjects() {
  const [list, setList] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    name: '', semester: 1, department: '', periodsPerWeek: 4,
    courseType: 'Theory', labDuration: 2, labSessionsPerWeek: 1,
    facultyRooms: [{ faculty: '', roomNumber: '', labRoomNumber: '' }]
  });
  const [message, setMessage] = useState(null);
  const [filterSemester, setFilterSemester] = useState('');
  const navigate = useNavigate();

  const load = () => {
    subjectsApi.getAll(filterSemester ? { semester: filterSemester } : {}).then(setList).catch(() => setList([]));
    departmentsApi.getAll().then(setDepartments).catch(() => setDepartments([]));
    facultyApi.getAll().then(setFaculty).catch(() => setFaculty([]));
  };

  useEffect(() => {
    load();
    setLoading(false);
  }, [filterSemester]);

  useEffect(() => {
    if (modal) {
      departmentsApi.getAll().then(setDepartments).catch(() => { });
      facultyApi.getAll().then(setFaculty).catch(() => { });
      subjectsApi.getAll().then(setAllSubjects).catch(() => setAllSubjects([]));
    }
  }, [modal]);

  const openCreate = (departmentId) => {
    setForm({
      name: '', semester: 1, department: departmentId || '', periodsPerWeek: 4,
      courseType: 'Theory', labDuration: 2, labSessionsPerWeek: 1,
      facultyRooms: [{ faculty: '', roomNumber: '', labRoomNumber: '' }]
    });
    setModal('create');
    setMessage(null);
  };

  const openEdit = (s) => {
    setForm({
      id: s._id,
      name: s.name,
      semester: s.semester,
      department: s.department?._id || s.department || '',
      periodsPerWeek: s.periodsPerWeek ?? 4,
      courseType: s.courseType || 'Theory',
      labDuration: s.labDuration || 2,
      labSessionsPerWeek: s.labSessionsPerWeek || 1,
      facultyRooms: [{ faculty: '', roomNumber: '', labRoomNumber: '' }]
    });
    setModal('edit');
    setMessage(null);
    subjectsApi.getFacultyRooms(s._id).then((rooms) => {
      if (rooms && rooms.length > 0) {
        setForm((prev) => ({
          ...prev,
          facultyRooms: rooms.map((r) => ({
            faculty: r.faculty?._id || r.faculty || '',
            roomNumber: r.roomNumber || '',
            labRoomNumber: r.labRoomNumber || ''
          }))
        }));
      }
    }).catch(() => { });
  };

  const addFacultyRoom = () => {
    setForm((prev) => ({
      ...prev,
      facultyRooms: [...prev.facultyRooms, { faculty: '', roomNumber: '', labRoomNumber: '' }]
    }));
  };

  const removeFacultyRoom = (index) => {
    setForm((prev) => ({
      ...prev,
      facultyRooms: prev.facultyRooms.filter((_, i) => i !== index)
    }));
  };

  const updateFacultyRoom = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      facultyRooms: prev.facultyRooms.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage(null);
    const valid = (form.facultyRooms || []).filter((r) => r.faculty && r.roomNumber && String(r.roomNumber).trim());
    if (valid.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one Faculty with Room number.' });
      return;
    }
    const payload = {
      name: form.name,
      semester: Number(form.semester) || 1,
      department: form.department,
      periodsPerWeek: Number(form.periodsPerWeek) || 4,
      courseType: form.courseType,
      labDuration: Number(form.labDuration),
      labSessionsPerWeek: Number(form.labSessionsPerWeek),
      facultyRooms: valid
    };
    if (modal === 'create') {
      subjectsApi.create(payload)
        .then(() => { setModal(null); load(); setMessage({ type: 'success', text: 'Subject created.' }); })
        .catch((err) => setMessage({ type: 'error', text: err.message }));
    } else {
      subjectsApi.update(form.id, payload)
        .then(() => { setModal(null); load(); setMessage({ type: 'success', text: 'Subject updated.' }); })
        .catch((err) => setMessage({ type: 'error', text: err.message }));
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this subject?')) return;
    subjectsApi.delete(id).then(() => load()).catch((err) => setMessage({ type: 'error', text: err.message }));
  };

  const getSubjectsByDepartment = (deptId) => {
    if (!deptId) return [];
    return list.filter((s) => (s.department?._id || s.department) === deptId);
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="subjects-page">
      <div className="page-header">
        <button type="button" className="btn btn-secondary btn-sm back-btn" onClick={() => navigate('/')}>← Back</button>
        <h1>Subjects</h1>
      </div>
      <div className="filter-bar">
        <label>Semester:</label>
        <select
          value={filterSemester}
          onChange={(e) => setFilterSemester(e.target.value)}
          className="filter-select"
        >
          <option value="">All</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      {message && <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>{message.text}</div>}

      {departments.length === 0 ? (
        <div className="card empty-state"><p>No departments yet. Add departments first.</p></div>
      ) : (
        <div className="dept-grid">
          {departments.map((dept) => {
            const deptSubjects = getSubjectsByDepartment(dept._id);
            return (
              <div key={dept._id} className="dept-card card">
                <div className="dept-card-header">
                  <h2>{dept.name} ({dept.departmentId})</h2>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => openCreate(dept._id)}>
                    Add Subject
                  </button>
                </div>
                <div className="table-wrap">
                  {deptSubjects.length === 0 ? (
                    <p className="empty-dept">No subjects in this department. Click Add Subject above.</p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Semester</th>
                          <th>Periods/Week</th>
                          <th>Faculty</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptSubjects.map((s) => (
                          <tr key={s._id}>
                            <td>{s.name}</td>
                            <td>{s.semester}</td>
                            <td>{s.periodsPerWeek}</td>
                            <td>{s.assignedFaculty?.name || '-'}</td>
                            <td>
                              <button type="button" className="btn btn-sm btn-secondary" onClick={() => openEdit(s)}>Edit</button>
                              <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(s._id)}>Delete</button>
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
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h2>{modal === 'create' ? 'Add Subject' : 'Edit Subject'}</h2>
            {message && <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>{message.text}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Subject Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Data Structures"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Semester</label>
                  <select
                    value={form.semester}
                    onChange={(e) => setForm(prev => ({ ...prev, semester: Number(e.target.value) }))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Periods per week</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.periodsPerWeek}
                    onChange={(e) => setForm(prev => ({ ...prev, periodsPerWeek: Number(e.target.value) || 4 }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Department</label>
                <select
                  required
                  value={form.department}
                  onChange={(e) => setForm(prev => ({ ...prev, department: e.target.value }))}
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name} ({d.departmentId})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Course Type</label>
                <select
                  value={form.courseType}
                  onChange={(e) => setForm(prev => ({ ...prev, courseType: e.target.value }))}
                >
                  <option value="Theory">Theory Only</option>
                  <option value="Theory + Lab">Theory + Lab</option>
                </select>
              </div>

              {form.courseType === 'Theory + Lab' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Lab Duration (periods/session)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={form.labDuration}
                      onChange={(e) => setForm(prev => ({ ...prev, labDuration: Number(e.target.value) || 2 }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Lab Sessions (per week)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={form.labSessionsPerWeek}
                      onChange={(e) => setForm(prev => ({ ...prev, labSessionsPerWeek: Number(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Faculty &amp; Room allocation</label>
                <p className="form-hint">Add each faculty and room. For Labs, specify Lab Room as well.</p>
                {(form.facultyRooms || []).map((row, index) => (
                  <div key={index} className="faculty-room-row">
                    <select
                      value={row.faculty}
                      onChange={(e) => updateFacultyRoom(index, 'faculty', e.target.value)}
                    >
                      <option value="">Select faculty</option>
                      {faculty.map((f) => (
                        <option key={f._id} value={f._id}>{f.name} ({f.facultyId})</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Theory Room"
                      value={row.roomNumber}
                      onChange={(e) => updateFacultyRoom(index, 'roomNumber', e.target.value)}
                    />
                    {form.courseType === 'Theory + Lab' && (
                      <input
                        type="text"
                        placeholder="Lab Room"
                        value={row.labRoomNumber || ''}
                        onChange={(e) => updateFacultyRoom(index, 'labRoomNumber', e.target.value)}
                      />
                    )}
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removeFacultyRoom(index)} disabled={(form.facultyRooms || []).length <= 1}>Remove</button>
                  </div>
                ))}
                <button type="button" className="btn btn-sm btn-secondary" onClick={addFacultyRoom}>Add faculty &amp; room</button>
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

export default Subjects;
