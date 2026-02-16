import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './Layout.css';

function Layout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isDashboard = location.pathname === '/';
  const isDashboardRoute = isDashboard && user && user.role === 'admin';
  const isLoginPage = location.pathname === '/' && !user;

  return (
    <div
      className={
        'layout' +
        (isDashboardRoute ? ' layout--dashboard' : '') +
        (isLoginPage ? ' layout--login' : '')
      }
    >
      <header className="header">
        <Link to="/" className={'brand' + (isLoginPage ? ' brand--login-only' : '')}>
          {!isLoginPage && <span className="brand-icon">◷</span>}
          College Timetable Generator
        </Link>

        <div className="header-right">
          {user && (
            <button type="button" className="btn-logout" onClick={logout}>
              Sign Out
            </button>
          )}
        </div>
      </header>

      <main
        className={
          'main' +
          (isDashboardRoute ? ' main--dashboard' : '') +
          (isLoginPage ? ' main--login' : '')
        }
      >
        {children}
      </main>
    </div>
  );
}

export default Layout;
