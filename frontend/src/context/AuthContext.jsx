import { useState, createContext, useContext, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch (error) {
          console.error("DEBUG: Authentication Check Failed:", error.response?.data || error.message);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2 expects 'username'
    formData.append('password', password);
    
    const res = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    localStorage.setItem('token', res.data.access_token);
    try {
      const userRes = await api.get('/auth/me');
      setUser(userRes.data);
    } catch (err) {
      console.error("DEBUG: Auto-fetch user after login failed:", err);
    }
  };

  const register = async (name, email, password, username) => {
    await api.post('/auth/register', { full_name: name, email, password, username });
    await login(email, password);
  };

  const googleLogin = async (credential) => {
    try {
      console.log("DEBUG: Attempting Google Login with Backend...");
      const res = await api.post('/auth/google', { credential });
      localStorage.setItem('token', res.data.access_token);
      setUser(res.data.user);
      return res.data;
    } catch (error) {
      console.error("DEBUG: Google Login Backend Error:", error.response?.data || error.message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, googleLogin, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
