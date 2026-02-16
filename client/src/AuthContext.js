import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from './services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        setLoading(false);
        setUser(null);
      }
    }, 5000);
    authApi.me()
      .then((res) => {
        if (!cancelled) setUser(res.user || null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);

  const login = async (payload) => {
    const res = await authApi.login(payload);
    setUser(res.user || null);
    return res.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      /* ignore - still clear local state */
    }
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    isFaculty: user?.role === 'faculty',
    isStudent: user?.role === 'student'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

