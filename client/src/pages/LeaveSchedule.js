import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { selfApi, publicApi } from '../services/api';
import './StudentDashboard.css';

function LeaveSchedule() {
    const navigate = useNavigate();
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        selfApi.getHolidays()
            .then((data) => setHolidays(Array.isArray(data) ? data : []))
            .catch(() => publicApi.getHolidays().then((data) => setHolidays(Array.isArray(data) ? data : [])))
            .catch((err) => setError(err.message || 'Could not load holidays.'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="holidays-page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate('/faculty-dashboard')}>
                    ← Back to Dashboard
                </button>
                <h1>Leave & Holiday Schedule</h1>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {loading && <div className="page-loading">Loading...</div>}

            <div className="holidays-list card">
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', color: '#1e293b' }}>Upcoming Public Holidays</h2>
                {holidays.map((h, index) => (
                    <div key={index} className="holiday-item">
                        <span className="holiday-date">{new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="holiday-name">{h.name}</span>
                    </div>
                ))}
                {holidays.length === 0 && !loading && !error && (
                    <p className="muted">No upcoming holidays found.</p>
                )}
            </div>

            <div className="card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', color: '#1e293b' }}>Personal Leaves</h2>
                <p className="muted">Personal leave tracking functionality will be available soon.</p>
            </div>
        </div>
    );
}

export default LeaveSchedule;
