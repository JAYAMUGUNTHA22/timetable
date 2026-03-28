import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { timetablesApi, facultyApi, subjectsApi } from '../services/api';
import './TimetableView.css';

function TimetableView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [timetable, setTimetable] = useState(null);
  const [faculty, setFaculty] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!id) return;
    timetablesApi.get(id)
      .then(setTimetable)
      .catch(() => setTimetable(null))
      .finally(() => setLoading(false));
    facultyApi.getAll().then(setFaculty).catch(() => []);
    subjectsApi.getAll().then(setSubjects).catch(() => []);
  }, [id]);

  const handleSlotSave = (dayIndex, periodIndex, assignments) => {
    setMessage(null);
    const type = 'Theory';
    timetablesApi.updateSlot(id, {
      dayIndex,
      periodIndex,
      type,
      assignments: assignments || []
    })
      .then(setTimetable)
      .then(() => { setEditing(null); setMessage({ type: 'success', text: 'Slot updated.' }); })
      .catch((err) => setMessage({ type: 'error', text: err.message }));
  };

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!timetable) {
    return (
      <div className="timetable-view-page">
        <div className="alert alert-error">Timetable not found.</div>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/timetables')}>← Back to Timetables</button>
      </div>
    );
  }

  const days = timetable.workingDays || [];
  const periodsPerDay = timetable.periodsPerDay || 7;
  const slots = timetable.slots || [];

  return (
    <div className="timetable-view-page">
      <div className="view-header">
        <button type="button" className="btn btn-secondary btn-sm back-btn" onClick={() => navigate('/timetables')}>
          ← Back
        </button>
        <div>
          <h1>{timetable.department?.name || 'Department'} (All Sections)</h1>
          <p className="view-meta">Semester {timetable.semester} · Generated {timetable.generatedAt ? new Date(timetable.generatedAt).toLocaleString() : '-'}</p>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>{message.text}</div>
      )}

      {timetable.generationErrors && timetable.generationErrors.length > 0 && (
        <div className="alert alert-warning">
          <strong>Warnings:</strong>
          <ul className="error-list">
            {timetable.generationErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="timetable-grid-wrap">
        <table className="timetable-grid">
          <thead>
            <tr>
              <th className="corner">Period / Day</th>
              {days.map((day, i) => (
                <th key={i}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: periodsPerDay }, (_, p) => (
              <tr key={p}>
                <td className="period-label">P{p + 1}</td>
                {days.map((day, d) => {
                  const slot = slots[d] && slots[d][p];
                  const key = `${d}-${p}`;
                  const isEditing = editing && editing.d === d && editing.p === p;

                  if (isEditing) {
                    return (
                      <td key={key} className="slot-cell slot-edit">
                        <SlotEditor
                          slot={slot}
                          timetable={timetable}
                          faculty={faculty}
                          subjects={subjects}
                          onSave={(assignments) =>
                            handleSlotSave(d, p, assignments)
                          }
                          onCancel={() => setEditing(null)}
                        />
                      </td>
                    );
                  }

                  return (
                    <td
                      key={key}
                      className={`slot-cell ${slot?.type === 'Lab' ? 'slot-lab' : ''}`}
                      onClick={() => setEditing({ d, p })}
                      title="Click to edit"
                    >
                      {slot && (slot.assignments && slot.assignments.length > 0) ? (
                        <div className="slot-content slot-content-compact">
                          {(() => {
                            const bySubject = {};
                            (slot.assignments || []).forEach(a => {
                              const name = a.subjectName || slot.subjectName || '-';
                              if (!bySubject[name]) bySubject[name] = [];
                              bySubject[name].push(a);
                            });
                            return Object.entries(bySubject).map(([subjName, arr]) => (
                              <div key={subjName} style={{ marginBottom: arr.length > 1 ? '6px' : 0 }}>
                                <div className="slot-subject" style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '2px' }}>
                                  {subjName}
                                  {slot?.type === 'Lab' ? <span className="lab-chip"> LAB</span> : null}
                                </div>
                                {arr.map(a => (
                                  <div key={a.sectionNumber} style={{ fontSize: '0.75rem', color: '#444', lineHeight: 1.25 }}>
                                    {a.facultyName || '-'}{a.facultyId ? ` (${a.facultyId})` : ''}{a.roomNumber ? ` - ${a.roomNumber}` : ''}
                                  </div>
                                ))}
                              </div>
                            ));
                          })()}
                        </div>
                      ) : (
                        <span className="slot-empty">—</span>
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

function SlotEditor({ slot, timetable, faculty, subjects, onSave, onCancel }) {
  const [assignments, setAssignments] = useState(() => {
    if (slot?.assignments && slot.assignments.length > 0) {
      return slot.assignments.map(a => ({
        sectionNumber: a.sectionNumber,
        subject: a.subject?._id || a.subject || '',
        subjectName: a.subjectName || '',
        faculty: a.faculty?._id || a.faculty || '',
        facultyName: a.facultyName || '',
        facultyId: a.facultyId || '',
        roomNumber: a.roomNumber || ''
      }));
    } else {
      const count = timetable.sectionsCount || 1;
      return Array.from({ length: count }, (_, i) => ({
        sectionNumber: i + 1,
        subject: '',
        subjectName: '',
        faculty: '',
        facultyName: '',
        facultyId: '',
        roomNumber: ''
      }));
    }
  });

  const handleAssignmentChange = (idx, field, value) => {
    const newAssig = [...assignments];
    newAssig[idx] = { ...newAssig[idx], [field]: value };
    if (field === 'subject') {
      const subj = subjects.find(s => s._id === value);
      newAssig[idx].subjectName = subj ? subj.name : '';
    } else if (field === 'faculty') {
      const fac = faculty.find(f => f._id === value);
      newAssig[idx].facultyName = fac ? fac.name : '';
      newAssig[idx].facultyId = fac ? (fac.facultyId || '') : '';
    }
    setAssignments(newAssig);
  };

  const handleSave = () => {
    const toSave = assignments.map(a => ({
      sectionNumber: a.sectionNumber,
      subject: a.subject || null,
      subjectName: a.subjectName || '',
      faculty: a.faculty || null,
      facultyName: a.facultyName || '',
      facultyId: a.facultyId || '',
      roomNumber: a.roomNumber || ''
    }));
    onSave(toSave);
  };

  return (
    <div className="slot-editor" style={{ minWidth: '280px' }}>
      {assignments.map((a, idx) => (
        <div key={idx} style={{ marginBottom: '10px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>Section {a.sectionNumber}</div>
          <select
            value={a.subject}
            onChange={(e) => handleAssignmentChange(idx, 'subject', e.target.value)}
            className="slot-select"
            style={{ width: '100%', marginBottom: '4px', fontSize: '0.8rem', padding: '4px' }}
          >
            <option value="">— Subject —</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>{s.name} (Sem {s.semester})</option>
            ))}
          </select>
          <select
            value={a.faculty}
            onChange={(e) => handleAssignmentChange(idx, 'faculty', e.target.value)}
            className="slot-select"
            style={{ width: '100%', marginBottom: '4px', fontSize: '0.8rem', padding: '4px' }}
          >
            <option value="">— Faculty —</option>
            {faculty.map((f) => (
              <option key={f._id} value={f._id}>{f.name}{f.facultyId ? ` (${f.facultyId})` : ''}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Room no."
            value={a.roomNumber}
            onChange={(e) => handleAssignmentChange(idx, 'roomNumber', e.target.value)}
            className="slot-select"
            style={{ width: '100%', fontSize: '0.8rem', padding: '4px' }}
          />
        </div>
      ))}

      <div className="slot-editor-actions" style={{ marginTop: '8px' }}>
        <button type="button" className="btn btn-sm btn-primary" onClick={handleSave}>Save</button>
        <button type="button" className="btn btn-sm btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default TimetableView;
