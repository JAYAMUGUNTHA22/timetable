import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './StudentDashboard.css';

function FacultyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const facultyName = user?.name || "Faculty";

  return (
    <div className="user-dashboard">
      <div className="user-dashboard__welcome">
        <h1>Welcome, {facultyName}!</h1>
        <p>Access your teaching schedule, leave calendar, and department timetables below.</p>
      </div>

      <div className="user-dashboard__grid">
        <div
          className="user-dashboard__card user-dashboard__card--clickable"
          onClick={() => navigate('/faculty-schedule')}
        >
          <div className="user-dashboard__card-icon user-dashboard__card-icon--timetable">📅</div>
          <h2>My Timetable</h2>
          <p>View your personal weekly teaching schedule and assigned classes.</p>
          <button type="button" className="btn btn-primary">View Schedule</button>
        </div>

        <div
          className="user-dashboard__card user-dashboard__card--clickable"
          onClick={() => navigate('/leave-schedule')}
        >
          <div className="user-dashboard__card-icon user-dashboard__card-icon--holidays">🏖</div>
          <h2>Leave Schedule</h2>
          <p>View public holidays and track your leave applications and approved time off.</p>
          <button type="button" className="btn btn-secondary">View Leaves</button>
        </div>

        <div
          className="user-dashboard__card user-dashboard__card--clickable"
          onClick={() => navigate('/department-timetables')}
        >
          <div className="user-dashboard__card-icon user-dashboard__card-icon--dept">🏫</div>
          <h2>Department Timetable</h2>
          <p>View the full timetable for your entire department and all sections.</p>
          <button type="button" className="btn btn-primary" style={{ background: '#2563eb', borderColor: '#2563eb' }}>View Department</button>
        </div>
      </div>
    </div>
  );
}

export default FacultyDashboard;


