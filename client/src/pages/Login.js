import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { publicApi } from '../services/api';
import './Login.css';
import Lottie from 'lottie-react';
import splashAnimation from '../Login.json';
import { auth, provider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

function Login() {
  useEffect(() => {
    document.body.classList.add('login-body');
    return () => {
      document.body.classList.remove('login-body');
    };
  }, []);

  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('admin');
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    email: '',
    password: '',
    facultyId: '',
    facultyName: '',
    studentEmail: '',
    departmentId: '',
    sectionNumber: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    publicApi.getDepartments()
      .then(setDepartments)
      .catch(err => console.error('Failed to load departments', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let payload;
      if (role === 'admin') {
        payload = {
          role: 'admin',
          email: form.email,
          password: form.password
        };
      } else if (role === 'faculty') {
        payload = {
          role: 'faculty',
          facultyId: form.facultyId,
          name: form.facultyName,
          password: form.password
        };
      } else {
        payload = {
          role: 'student',
          email: form.studentEmail,
          departmentId: form.departmentId,
          sectionNumber: Number(form.sectionNumber) || 1,
          password: form.password
        };
      }
      const user = await login(payload);
      if (user.role === 'admin') {
        navigate('/');
      } else if (user.role === 'faculty') {
        navigate('/');
      } else if (user.role === 'student') {
        navigate('/student-dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const email = user.email;
      const name = user.displayName;

      let payload;

      if (role === 'admin') {
        payload = { role: 'admin', email, google: true };
      } else if (role === 'faculty') {
        payload = { role: 'faculty', email, name, google: true };
      } else {
        payload = {
          role: 'student',
          email,
          departmentId: form.departmentId,
          sectionNumber: Number(form.sectionNumber) || 1,
          google: true
        };
      }

      const loggedUser = await login(payload);
      if (!loggedUser) return;

      if (loggedUser.role === 'admin') navigate('/');
      else if (loggedUser.role === 'faculty') navigate('/');
      else if (loggedUser.role === 'student') navigate('/student-dashboard');

    } catch (err) {
      console.error(err);
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="dashboard-animation-wrap">
          <Lottie
            animationData={splashAnimation}
            loop
            className="login-lottie"
            style={{ width: '100%', height: 600, maxWidth: 660 }}
          />
        </div>
      </div>
      <div className="login-card">
        <h1>Sign in</h1>
        <p className="login-subtitle">Choose your role and enter your details.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="login-role-toggle">
          <button type="button" className={role === 'admin' ? 'active' : ''} onClick={() => setRole('admin')}>Admin</button>
          <button type="button" className={role === 'faculty' ? 'active' : ''} onClick={() => setRole('faculty')}>Faculty</button>
          <button type="button" className={role === 'student' ? 'active' : ''} onClick={() => setRole('student')}>Student</button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {role === 'admin' && (
            <>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
            </>
          )}

          {role === 'faculty' && (
            <>
              <div className="form-group">
                <label>Faculty ID</label>
                <input
                  required
                  value={form.facultyId}
                  onChange={(e) => setForm((prev) => ({ ...prev, facultyId: e.target.value }))}
                  placeholder="e.g. CSE001"
                />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input
                  required
                  value={form.facultyName}
                  onChange={(e) => setForm((prev) => ({ ...prev, facultyName: e.target.value }))}
                  placeholder="Exact name as in Faculty list"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
            </>
          )}

          {role === 'student' && (
            <>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  required
                  value={form.studentEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, studentEmail: e.target.value }))}
                  placeholder="student@example.com"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <select
                    required
                    value={form.departmentId}
                    onChange={(e) => setForm((prev) => ({ ...prev, departmentId: e.target.value }))}
                    className="form-control"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #ddd',
                      fontSize: '13px',
                      background: '#ffffff',
                      color: '#222'
                    }}
                  >
                    <option value="">Select Dept</option>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.departmentId}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Section</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.sectionNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, sectionNumber: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          {role === 'admin' && (
            <>
              <div className="divider">
                <span>OR</span>
              </div>
              <button
                type="button"
                className="google-btn"
                onClick={handleGoogleLogin}
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="google"
                  className="google-icon"
                />
                Sign in with Google
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default Login;
