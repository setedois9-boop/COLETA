import React, { createContext, useContext, useEffect, useState } from 'react';
import { AdminUser, LoginResponse } from '../types';
import { fetchAdminMe, loginAdmin, verify2FALogin, logoutAdmin, setAuthToken, getAuthToken } from '../services/api';

interface AuthContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, pass: string, two_factor_code?: string, pre_auth_token?: string) => Promise<LoginResponse>;
  verify2FA: (pre_auth_token: string, two_factor_code: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  admin: null,
  isAuthenticated: false,
  loading: true,
  login: async () => ({}),
  verify2FA: async () => ({}),
  logout: async () => {},
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

  const login = async (
    email: string,
    pass: string,
    two_factor_code?: string,
    pre_auth_token?: string
  ): Promise<LoginResponse> => {
    setAuthToken(null);
    setAdmin(null);
    const res = await loginAdmin(email, pass, two_factor_code, pre_auth_token);
    if (res.admin) {
      setAdmin(res.admin);
    }
    return res;
  };

  const verify2FA = async (
    pre_auth_token: string,
    two_factor_code: string
  ): Promise<LoginResponse> => {
    const res = await verify2FALogin(pre_auth_token, two_factor_code);
    if (res.admin) {
      setAdmin(res.admin);
    }
    return res;
  };

  const logout = async () => {
    let logoutError: unknown;
    try {
      await logoutAdmin();
    } catch (error) {
      logoutError = error;
    } finally {
      setAuthToken(null);
      setAdmin(null);
      localStorage.removeItem('admin_token');
    }
    if (logoutError) throw logoutError;
  };

  return (
    <AuthContext.Provider value={{ admin, isAuthenticated: !!admin, loading, login, verify2FA, logout, refreshAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
