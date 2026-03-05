import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { selfApi } from '../services/api';
import './Faculty.css';

function FacultySchedule() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState(1);

  const load = (sem) => {
    setLoading(true);
    selfApi.facultyTimetable(sem)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load timetable.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(semester);
  }, [semester]);

  if (loading) return <div className="page-loading">Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return null;

  const { workingDays, periodsPerDay, grid, faculty } = data;

  return (
    <div className="faculty-page">
      <div className="page-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate('/')}
          style={{ marginRight: '16px' }}
        >
          ← Back to Dashboard
        </button>
        <h1>My Schedule</h1>
      </div>
      {faculty && (
        <p className="page-desc">
          {faculty.name} ({faculty.facultyId}) – {faculty.department?.name} ({faculty.department?.departmentId})
        </p>
      )}
      <div className="filter-bar">
        <label>Semester:</label>
        <select
          value={semester}
          onChange={(e) => {
            const sem = Number(e.target.value);
            setSemester(sem);
            load(sem);
          }}
          className="filter-select"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Day \\ Period</th>
              {Array.from({ length: periodsPerDay }).map((_, i) => (
                <th key={i}>{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workingDays.map((day, d) => (
              <tr key={day}>
                <th>{day}</th>
                {grid[d].map((cell, p) => (
                  <td key={p}>
                    {cell.status === 'break' && <span className="muted">Break</span>}
                    {cell.status === 'free' && <span className="muted">Free</span>}
                    {cell.status === 'class' && (
                      <div className="slot-cell">
                        <div className="slot-main">{cell.subjectName}</div>
                        <div className="slot-sub">
                          Sec {cell.sectionNumber}{cell.roomNumber ? ` · Room ${cell.roomNumber}` : ''}
                        </div>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FacultySchedule;

