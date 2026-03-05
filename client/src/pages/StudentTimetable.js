import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { selfApi } from '../services/api';
import './TimetableView.css';

function StudentTimetable() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState(1);

  const load = useCallback((sem) => {
    setLoading(true);
    selfApi.studentTimetable(sem)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load timetable.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(semester);
  }, [load, semester]);

  if (loading) return <div className="page-loading">Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <div className="alert alert-error">No timetable found for your section.</div>;

  const { workingDays = [], periodsPerDay = 7, slots = [], department, sectionNumber } = data;

  return (
    <div className="timetable-view-page">
      <div className="view-header">
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/student-dashboard')}
          style={{ marginRight: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}
        >
          ← Back
        </button>
        <div>
          <h1>{department?.name || 'Department'} — Section {sectionNumber}</h1>
          <p className="view-meta">Semester {data.semester}</p>
        </div>
      </div>

      <div className="filter-bar">
        <label>Semester:</label>
        <select
          value={semester}
          onChange={(e) => {
            const sem = Number(e.target.value);
            setSemester(sem);
          }}
          className="filter-select"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="timetable-grid card">
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
                {Array.from({ length: periodsPerDay }).map((_, p) => {
                  const slotRow = slots[d] || [];
                  const slot = slotRow[p] || null;
                  return (
                    <td key={p}>
                      {slot ? (
                        <div className={`slot-cell ${slot.type === 'Lab' ? 'slot-lab' : ''}`}>
                          <div className="slot-main">{slot.subjectName}</div>
                          <div className="slot-sub">
                            {slot.facultyName}{slot.roomNumber ? ` · Room ${slot.roomNumber}` : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StudentTimetable;

