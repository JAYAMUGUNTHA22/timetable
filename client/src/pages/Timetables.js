import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { timetablesApi, departmentsApi } from '../services/api';
import './Timetables.css';

function Timetables() {
  const [list, setList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [semester, setSemester] = useState(1);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [message, setMessage] = useState(null);
  const [filterSemester, setFilterSemester] = useState('');
  const navigate = useNavigate();

  const load = () => {
    const params = filterSemester ? { semester: filterSemester } : {};
    return timetablesApi.getAll(params).then(setList).catch(() => setList([]));
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [filterSemester]);

  useEffect(() => {
    departmentsApi.getAll().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  const handleGenerate = (e) => {
    e.preventDefault();
    setGenerating(true);
    setMessage(null);
    timetablesApi.generate(semester, { replaceExisting })
      .then((res) => {
        load();
        const errCount = (res.errors || []).length;
        const count = (res.timetables || []).length;
        let text = res.message || 'Done.';
        let type = 'success';
        if (count === 0 && errCount > 0) {
          type = 'error';
          text = res.message || (res.errors && res.errors[0]) || 'No timetables generated.';
        } else if (count === 0 && (res.skippedDepartments || []).length > 0) {
          type = 'warning';
          text = res.message || text;
        } else if (errCount > 0) {
          type = 'warning';
          text = text + ' ' + errCount + ' slot warning(s). Check timetable view.';
        }
        setMessage({ type, text });
        if (res.errors && res.errors.length > 0) {
          console.warn('Generation warnings:', res.errors);
        }
      })
      .catch((err) => {
        setMessage({ type: 'error', text: err.message || 'Generation failed. Is the backend running? Check Academic Config, and that each subject has Faculty & Room allocated.' });
      })
      .finally(() => setGenerating(false));
  };

  const handleDeleteBySemester = () => {
    const sem = prompt('Enter semester number to delete all timetables for:');
    if (sem === null || sem === '') return;
    const n = parseInt(sem, 10);
    if (isNaN(n)) {
      setMessage({ type: 'error', text: 'Invalid semester.' });
      return;
    }
    if (!window.confirm('Delete all timetables for semester ' + n + '?')) return;
    timetablesApi.deleteBySemester(n)
      .then((res) => {
        load();
        setMessage({ type: 'success', text: res.message });
      })
      .catch((err) => setMessage({ type: 'error', text: err.message }));
  };

  const getTimetablesByDepartment = (deptId) => {
    if (!deptId) return [];
    const deptIdStr = String(deptId);
    return list.filter((tt) => {
      const ttDeptId = tt.department?._id || tt.department;
      return ttDeptId != null && String(ttDeptId) === deptIdStr;
    });
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="timetables-page">
      <div className="page-header">
        <button type="button" className="btn btn-secondary btn-sm back-btn" onClick={() => navigate('/')}>← Back</button>
        <div>
          <h1>Timetables</h1>
          <p className="page-desc">Generate and view timetables per department and section.</p>
        </div>
      </div>

      <div className="generate-card card">
        <h2>Generate Timetables</h2>
        <form onSubmit={handleGenerate} className="generate-form">
          <div className="form-group">
            <label>Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={generating}>
            {generating ? 'Generating...' : replaceExisting ? 'Regenerate all' : 'Generate'}
          </button>
          <label className="checkbox-label generate-regenerate-all">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
            />
            Regenerate all (replace existing timetables for this semester)
          </label>
        </form>
        <p className="generate-hint">Use the same semester as your subjects. <strong>Regenerate all</strong> is checked by default to create fresh timetables with 4 different faculty per cell and all subjects allocated. For 4 faculty per cell, set Department sections to 4 and add multiple faculty per subject in Subjects → Faculty &amp; Room.</p>
      </div>

      <div className="filter-bar">
        <label>Filter by semester:</label>
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
        <button type="button" className="btn btn-sm btn-danger" onClick={handleDeleteBySemester}>
          Delete by semester
        </button>
      </div>

      {message && (
        <div className={'alert alert-' + (message.type === 'success' ? 'success' : message.type === 'warning' ? 'warning' : 'error')}>
          {message.text}
        </div>
      )}

      {departments.length === 0 ? (
        <div className="card empty-state">
          <p>No departments yet. Add departments first, then generate timetables.</p>
        </div>
      ) : list.length === 0 ? (
        <div className="card empty-state">
          <p>No timetables yet. Generate one using the form above.</p>
        </div>
      ) : (
        <div className="timetable-dept-grid">
          {departments.map((dept) => {
            const deptTimetables = getTimetablesByDepartment(dept._id);
            return (
              <div key={dept._id} className="dept-card card">
                <div className="dept-card-header">
                  <h2>{dept.name} ({dept.departmentId})</h2>
                </div>
                {deptTimetables.length === 0 ? (
                  <p className="empty-dept">No timetables for this department. Generate timetables above.</p>
                ) : (
                  <div className="timetable-list">
                    {deptTimetables.map((tt) => (
                      <div key={tt._id} className="timetable-card">
                        <div className="timetable-card-header">
                          <div>
                            <h3>Section {tt.sectionNumber}</h3>
                            <p className="timetable-meta">Semester {tt.semester} · {(tt.workingDays && tt.workingDays.length) || 0} days × {tt.periodsPerDay || 0} periods</p>
                          </div>
                          <Link to={'/timetables/' + tt._id} className="btn btn-primary btn-sm">View</Link>
                        </div>
                        {tt.generationErrors && tt.generationErrors.length > 0 && (
                          <div className="alert alert-warning alert-sm">
                            {tt.generationErrors.length} slot warning(s)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Timetables;
