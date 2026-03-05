import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './Layout.css';

function Layout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const [showProfile, setShowProfile] = React.useState(false);
  const profileRef = React.useRef(null);

  const isDashboard = location.pathname === '/';
  const isDashboardRoute = isDashboard && user && user.role === 'admin';
  const isLoginPage = location.pathname === '/' && !user;

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            <div className="profile-container" ref={profileRef}>
              <button
                type="button"
                className="profile-icon-btn"
                onClick={() => setShowProfile(!showProfile)}
                title="View Profile"
              >
                <div className="profile-avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : user.role.charAt(0).toUpperCase()}
                </div>
              </button>

              {showProfile && (
                <div className="profile-dropdown-card">
                  <div className="profile-dropdown-header">
                    <div className="profile-avatar-large">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.role.charAt(0).toUpperCase()}
                    </div>
                    <h3>{user.name || 'User'}</h3>
                    <span className="role-badge">{user.role}</span>
                  </div>
                  <div className="profile-dropdown-body">
                    <div className="profile-info-item">
                      <label>Email</label>
                      <span>{user.email || '—'}</span>
                    </div>
                    {user.role === 'faculty' && (
                      <>
                        <div className="profile-info-item">
                          <label>Faculty ID</label>
                          <span>{user.facultyId || '—'}</span>
                        </div>
                        <div className="profile-info-item">
                          <label>Department</label>
                          <span>{user.departmentName || '—'}</span>
                        </div>
                      </>
                    )}
                    {user.role === 'student' && (
                      <>
                        <div className="profile-info-item">
                          <label>Department</label>
                          <span>{user.departmentName || '—'}</span>
                        </div>
                        <div className="profile-info-item">
                          <label>Section</label>
                          <span>{user.sectionNumber ?? '—'}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="profile-dropdown-footer">
                    <button type="button" className="btn-logout" onClick={() => { logout(); setShowProfile(false); }}>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
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
