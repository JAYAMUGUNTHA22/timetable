import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './Layout.css';

function Layout({ children }) {
  const location = useLocation();
  const { user } = useAuth();

  const nav = [
    { path: '/', label: 'Dashboard' },
    { path: '/config', label: 'Academic Config' },
    { path: '/departments', label: 'Departments' },
    { path: '/subjects', label: 'Subjects' },
    { path: '/faculty', label: 'Faculty' },
    { path: '/timetables', label: 'Timetables' }
  ];

  const isDashboard = location.pathname === '/';
  const isDashboardRoute = isDashboard && user && user.role === 'admin';
  const isLoginPage = location.pathname === '/login';   // ✅ Added
  const showNav = !!user && user.role === 'admin';

  return (
    <div
      className={
        'layout' +
        (isDashboardRoute ? ' layout--dashboard' : '') +
        (isLoginPage ? ' layout--login' : '')   // ✅ Added
      }
    >
      <header className="header">
        <Link to="/" className="brand">
          <span className="brand-icon">◷</span>
          College Timetable Generator
        </Link>

        {showNav && (
          <nav className="nav">
            {nav.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={
                  'nav-link' +
                  (location.pathname === path ? ' active' : '')
                }
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main
        className={
          'main' + (isDashboardRoute ? ' main--dashboard' : '')
        }
      >
        {children}
      </main>
    </div>
  );
}

export default Layout;
