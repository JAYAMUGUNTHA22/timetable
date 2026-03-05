import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AcademicConfig from './pages/AcademicConfig';
import Departments from './pages/Departments';
import Subjects from './pages/Subjects';
import Faculty from './pages/Faculty';
import Timetables from './pages/Timetables';
import TimetableView from './pages/TimetableView';
import Login from './pages/Login';
import FacultySchedule from './pages/FacultySchedule';
import StudentTimetable from './pages/StudentTimetable';
import StudentDashboard from './pages/StudentDashboard';
import StudentHolidays from './pages/StudentHolidays';
import FacultyDashboard from './pages/FacultyDashboard';
import LeaveSchedule from './pages/LeaveSchedule';
import DepartmentTimetables from './pages/DepartmentTimetables';
import { useAuth } from './AuthContext';

function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || (role && user.role !== role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function HomeRouter() {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Loading...</div>;
  if (!user) return <Login />;
  if (user.role === 'admin') return <Dashboard />;
  if (user.role === 'faculty') return <FacultyDashboard />;
  if (user.role === 'student') return <StudentDashboard />;
  return <Dashboard />;
}

function AppContent() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="route-transition">
      <Routes location={location}>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/" element={<HomeRouter />} />
        <Route
          path="/config"
          element={(
            <RequireRole role="admin">
              <AcademicConfig />
            </RequireRole>
          )}
        />
        <Route
          path="/departments"
          element={(
            <RequireRole role="admin">
              <Departments />
            </RequireRole>
          )}
        />
        <Route
          path="/subjects"
          element={(
            <RequireRole role="admin">
              <Subjects />
            </RequireRole>
          )}
        />
        <Route
          path="/faculty"
          element={(
            <RequireRole role="admin">
              <Faculty />
            </RequireRole>
          )}
        />
        <Route
          path="/timetables"
          element={(
            <RequireRole role="admin">
              <Timetables />
            </RequireRole>
          )}
        />
        <Route
          path="/timetables/:id"
          element={(
            <RequireRole role="admin">
              <TimetableView />
            </RequireRole>
          )}
        />
        <Route
          path="/faculty-schedule"
          element={(
            <RequireRole role="faculty">
              <FacultySchedule />
            </RequireRole>
          )}
        />
        <Route
          path="/student-timetable"
          element={(
            <RequireRole role="student">
              <StudentTimetable />
            </RequireRole>
          )}
        />
        <Route
          path="/faculty-dashboard"
          element={(
            <RequireRole role="faculty">
              <FacultyDashboard />
            </RequireRole>
          )}
        />
        <Route
          path="/student-dashboard"
          element={(
            <RequireRole role="student">
              <StudentDashboard />
            </RequireRole>
          )}
        />
        <Route
          path="/student-holidays"
          element={(
            <RequireRole role="student">
              <StudentHolidays />
            </RequireRole>
          )}
        />
        <Route
          path="/leave-schedule"
          element={(
            <RequireRole role="faculty">
              <LeaveSchedule />
            </RequireRole>
          )}
        />
        <Route
          path="/department-timetables"
          element={(
            <RequireRole role="faculty">
              <DepartmentTimetables />
            </RequireRole>
          )}
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Layout>
      <AppContent />
    </Layout>
  );
}

export default App;
