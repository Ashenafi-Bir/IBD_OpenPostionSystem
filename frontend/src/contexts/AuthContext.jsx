import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import { storage } from '../utils/storage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(storage.getToken());

  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = storage.getToken();
      if (savedToken) {
        try {
          const userData = await authService.getProfile();
          setUser(userData);
        } catch (error) {
          storage.removeToken();
          setToken(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      const { token, user } = response; // Assuming your API returns these
      storage.setToken(token);
      setUser(user);
      setToken(token);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const logout = () => {
    storage.removeToken();
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole: (role) => user?.role === role, // Check for a single role
    hasAnyRole: (roles) => roles.some(role => user?.role === role) // Check for any role
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
