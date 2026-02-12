import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import { configApi, departmentsApi, subjectsApi, facultyApi, timetablesApi } from '../services/api';
import splashAnimation from '../splash.json';
import './Dashboard.css';

const QUOTE = {
  text: 'The key is not to prioritize what\'s on your schedule, but to schedule your priorities.',
  author: 'Stephen Covey'
};

function Dashboard() {
  const [config, setConfig] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      configApi.get().catch(() => null),
      departmentsApi.getAll().catch(() => []),
      subjectsApi.getAll().catch(() => []),
      facultyApi.getAll().catch(() => []),
      timetablesApi.getAll().catch(() => [])
    ]).then(([c, d, s, f, t]) => {
      setConfig(c);
      setDepartments(d);
      setSubjects(s);
      setFaculty(f);
      setTimetables(t);
      setLoading(false);
    }).catch(() => {
      setError('Failed to load data');
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="page-loading">Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard">
        <div className="dashboard-left">
          <div className="dashboard-animation-wrap">
            <Lottie
              animationData={splashAnimation}
              loop
              className="dashboard-lottie"
              style={{ width: '100%', height: 500, maxWidth: 560 }}
            />
          </div>
        </div>
        <div className="dashboard-right">
        <h1 className="dashboard-title">College Timetable Generator</h1>
        <p className="dashboard-tagline">Create and manage academic schedules for your institution</p>
        <div className="dashboard-stats">
          <div className="dashboard-stat">
            <span className="dashboard-stat-value">{departments.length}</span>
            <span className="dashboard-stat-label">Departments</span>
          </div>
          <div className="dashboard-stat">
            <span className="dashboard-stat-value">{subjects.length}</span>
            <span className="dashboard-stat-label">Subjects</span>
          </div>
          <div className="dashboard-stat">
            <span className="dashboard-stat-value">{faculty.length}</span>
            <span className="dashboard-stat-label">Faculty</span>
          </div>
          <div className="dashboard-stat">
            <span className="dashboard-stat-value">{timetables.length}</span>
            <span className="dashboard-stat-label">Timetables</span>
          </div>
        </div>
        <blockquote className="dashboard-quote">
          <p className="dashboard-quote-text">"{QUOTE.text}"</p>
          <cite className="dashboard-quote-author">— {QUOTE.author}</cite>
        </blockquote>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
