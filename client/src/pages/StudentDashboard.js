import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './StudentDashboard.css';

function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="user-dashboard">
      <div className="user-dashboard__welcome">
        <h1>Welcome back, {user?.name || 'Student'}!</h1>
        <p>Check your class schedule and upcoming holidays below.</p>
      </div>

      <div className="user-dashboard__grid">
        <div
          className="user-dashboard__card user-dashboard__card--clickable"
          onClick={() => navigate('/student-timetable')}
        >
          <div className="user-dashboard__card-icon user-dashboard__card-icon--timetable">📅</div>
          <h2>My Timetable</h2>
          <p>View your weekly class schedule, including subjects, faculty, and room numbers.</p>
          <button type="button" className="btn btn-primary">Go to Timetable</button>
        </div>

        <div
          className="user-dashboard__card user-dashboard__card--clickable"
          onClick={() => navigate('/student-holidays')}
        >
          <div className="user-dashboard__card-icon user-dashboard__card-icon--holidays">🏖</div>
          <h2>Upcoming Holidays</h2>
          <p>View the list of upcoming holidays for the academic year.</p>
          <button type="button" className="btn btn-secondary">View Holidays</button>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
