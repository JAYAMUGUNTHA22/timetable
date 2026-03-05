import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { selfApi } from '../services/api';
import './Faculty.css';

function DepartmentTimetables() {
    const navigate = useNavigate();
    const [timetables, setTimetables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [semester, setSemester] = useState(1);

    const load = (sem) => {
        setError(null);
        setLoading(true);
        selfApi.departmentTimetables(sem)
            .then((data) => setTimetables(Array.isArray(data) ? data : []))
            .catch((err) => setError(err.message || 'Failed to load department timetables.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load(semester);
    }, [semester]);

    if (loading) return <div className="page-loading">Loading...</div>;
    if (error) return <div className="alert alert-error">{error}</div>;

    return (
        <div className="faculty-page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate('/faculty-dashboard')}>
                    ← Back to Dashboard
                </button>
                <h1>Department Timetables</h1>
            </div>

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

            {timetables.length === 0 ? (
                <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                    No timetables found for this semester in your department.
                </div>
            ) : (
                <div className="dept-tt-grid">
                    {timetables.map((tt) => (
                        <div key={tt._id} className="card tt-section-card">
                            <div className="card-header">
                                <h3>{tt.department?.name} - Section {tt.sectionNumber}</h3>
                            </div>
                            <div className="table-wrap mini-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Day</th>
                                            {tt.slots[0]?.map((_, i) => (
                                                <th key={i}>{i + 1}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, d) => (
                                            <tr key={day}>
                                                <th>{day}</th>
                                                {tt.slots[d]?.map((slot, p) => (
                                                    <td key={p} className={slot?.courseType === 'Theory + Lab' ? 'slot-lab' : ''}>
                                                        {slot?.subjectName || '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default DepartmentTimetables;
