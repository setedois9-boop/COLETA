import React, { createContext, useContext, useEffect, useState } from 'react';
import { AdminUser, LoginResponse } from '../types';
import { fetchAdminMe, loginAdmin, setAuthToken, getAuthToken } from '../services/api';

interface AuthContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, pass: string, two_factor_code?: string) => Promise<LoginResponse>;
  logout: () => void;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  admin: null,
  isAuthenticated: false,
  loading: true,
  login: async () => ({}),
  logout: () => {},
  refreshAdmin: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAdmin = async () => {
    try {
      const res = await fetchAdminMe();
      setAdmin(res.admin);
    } catch {
      setAuthToken(null);
      setAdmin(null);
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    refreshAdmin().finally(() => {
      setLoading(false);
    });
  }, []);

  const login = async (email: string, pass: string, two_factor_code?: string): Promise<LoginResponse> => {
    const res = await loginAdmin(email, pass, two_factor_code);
    if (res.admin) {
      setAdmin(res.admin);
    }
    return res;
  };

  const logout = () => {
    setAuthToken(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, isAuthenticated: !!admin, loading, login, logout, refreshAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
