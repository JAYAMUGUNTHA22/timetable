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

  const handleSlotSave = (dayIndex, periodIndex, subjectId, facultyId, subjectName, facultyName, roomNumber) => {
    setMessage(null);
    timetablesApi.updateSlot(id, {
      dayIndex,
      periodIndex,
      subject: subjectId || null,
      faculty: facultyId || null,
      subjectName: subjectName || '',
      facultyName: facultyName || '',
      roomNumber: roomNumber || ''
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
          <h1>{timetable.department?.name || 'Department'} — Section {timetable.sectionNumber}</h1>
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
                          faculty={faculty}
                          subjects={subjects}
                          onSave={(subId, facId, subName, facName, roomNumber) =>
                            handleSlotSave(d, p, subId, facId, subName, facName, roomNumber)
                          }
                          onCancel={() => setEditing(null)}
                        />
                      </td>
                    );
                  }

                  return (
                    <td
                      key={key}
                      className="slot-cell"
                      onClick={() => setEditing({ d, p })}
                      title="Click to edit"
                    >
                      {slot && (slot.subjectName || slot.facultyName) ? (
                        <div className="slot-content">
                          <div className="slot-subject">{slot.subjectName || '-'}</div>
                          <div className="slot-faculty">
                            {slot.facultyName
                              ? (slot.roomNumber ? slot.facultyName + ' (Room ' + slot.roomNumber + ')' : slot.facultyName)
                              : (slot.subjectName === 'Free' ? 'Free' : '')}
                          </div>
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

function SlotEditor({ slot, faculty, subjects, onSave, onCancel }) {
  const [subjectId, setSubjectId] = useState(slot?.subject?._id || slot?.subject || '');
  const [facultyId, setFacultyId] = useState(slot?.faculty?._id || slot?.faculty || '');
  const [roomNumber, setRoomNumber] = useState(slot?.roomNumber || '');

  const subject = subjects.find((s) => s._id === subjectId);
  const fac = faculty.find((f) => f._id === facultyId);
  const subjectName = subject?.name || '';
  const facultyName = fac?.name || '';

  const handleSave = () => {
    onSave(subjectId || null, facultyId || null, subjectName, facultyName, roomNumber);
  };

  return (
    <div className="slot-editor">
      <select
        value={subjectId}
        onChange={(e) => setSubjectId(e.target.value)}
        className="slot-select"
      >
        <option value="">— None / Free —</option>
        {subjects.map((s) => (
          <option key={s._id} value={s._id}>{s.name} (Sem {s.semester})</option>
        ))}
      </select>
      <select
        value={facultyId}
        onChange={(e) => setFacultyId(e.target.value)}
        className="slot-select"
      >
        <option value="">— None —</option>
        {faculty.map((f) => (
          <option key={f._id} value={f._id}>{f.name}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Room no."
        value={roomNumber}
        onChange={(e) => setRoomNumber(e.target.value)}
        className="slot-select"
      />
      <div className="slot-editor-actions">
        <button type="button" className="btn btn-sm btn-primary" onClick={handleSave}>Save</button>
        <button type="button" className="btn btn-sm btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default TimetableView;
