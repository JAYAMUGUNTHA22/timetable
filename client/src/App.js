import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import { useAuth } from './AuthContext';

function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || (role && user.role !== role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function HomeRouter() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Dashboard />;
  if (user.role === 'faculty') return <FacultySchedule />;
  if (user.role === 'student') return <StudentTimetable />;
  return <Dashboard />;
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={(
            <HomeRouter />
          )}
        />
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
      </Routes>
    </Layout>
  );
}

export default App;
