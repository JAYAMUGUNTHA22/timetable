import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { departmentsApi, subjectsApi, facultyApi, timetablesApi } from '../services/api';
import './Dashboard.css';

const CARDS = [
  {
    path: '/config',
    title: 'Academic Configuration',
    subtitle: 'Configure semesters, periods, and session settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    )
  },
  {
    path: '/departments',
    title: 'Departments',
    subtitle: 'Manage academic departments and sections',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    )
  },
  {
    path: '/subjects',
    title: 'Subjects',
    subtitle: 'Define courses and assign faculty',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="16" y2="11" />
      </svg>
    )
  },
  {
    path: '/faculty',
    title: 'Faculty',
    subtitle: 'Manage faculty members and assignments',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  },
  {
    path: '/timetables',
    title: 'Timetables',
    subtitle: 'Generate and manage class schedules',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    )
  }
];

function NavCard({ item, index, onRipple }) {
  const cardRef = useRef(null);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onRipple && onRipple(cardRef.current, x, y);
  };

  return (
    <Link
      to={item.path}
      className="dashboard-card"
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={handleClick}
    >
      <span ref={cardRef} className="dashboard-card-inner">
        <span className="dashboard-card-ripple" />
        <div className="dashboard-card-icon">{item.icon}</div>
        <h3 className="dashboard-card-title">{item.title}</h3>
        <p className="dashboard-card-subtitle">{item.subtitle}</p>
      </span>
    </Link>
  );
}

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ departments: 0, subjects: 0, faculty: 0, timetables: 0 });

  useEffect(() => {
    Promise.all([
      departmentsApi.getAll().catch(() => []),
      subjectsApi.getAll().catch(() => []),
      facultyApi.getAll().catch(() => []),
      timetablesApi.getAll().catch(() => [])
    ]).then(([d, s, f, t]) => {
      setStats({ departments: d.length, subjects: s.length, faculty: f.length, timetables: t.length });
      setLoading(false);
    }).catch(() => {
      setError('Failed to load data');
      setLoading(false);
    });
  }, []);

  const createRipple = (innerEl, x, y) => {
    if (!innerEl) return;
    const ripple = innerEl.querySelector('.dashboard-card-ripple');
    if (ripple) {
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.classList.add('ripple-active');
      setTimeout(() => ripple.classList.remove('ripple-active'), 600);
    }
  };

  if (loading) return <div className="dashboard-loading">Loading...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-bubbles" aria-hidden="true">
        <span className="bubble bubble-1" />
        <span className="bubble bubble-2" />
        <span className="bubble bubble-3" />
        <span className="bubble bubble-4" />
        <span className="bubble bubble-5" />
        <span className="bubble bubble-6" />
        <span className="bubble bubble-7" />
        <span className="bubble bubble-8" />
        <span className="bubble bubble-9" />
        <span className="bubble bubble-10" />
      </div>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1 className="dashboard-title">Administration</h1>
          <p className="dashboard-tagline">Manage your institution&apos;s academic schedule</p>
        </header>

        <div className="dashboard-grid">
          {CARDS.map((item, i) => (
            <NavCard key={item.path} item={item} index={i} onRipple={(el, x, y) => createRipple(el, x, y)} />
          ))}
        </div>

        <div className="dashboard-footer">
          <p className="dashboard-summary">
            {stats.departments} departments · {stats.subjects} subjects · {stats.faculty} faculty · {stats.timetables} timetables
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
