import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface AdminInfo {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: 'superadmin' | 'moderator' | 'support';
  avatar_url?: string | null;
}

interface AuthContextType {
  token: string;
  admin: AdminInfo | null;
  login: (token: string, admin: AdminInfo) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token') || '');
  const [admin, setAdmin] = useState<AdminInfo | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('admin_info') || 'null');
    } catch { return null; }
  });

  const login = useCallback((t: string, a: AdminInfo) => {
    setToken(t);
    setAdmin(a);
    localStorage.setItem('admin_token', t);
    localStorage.setItem('admin_info', JSON.stringify(a));
  }, []);

  const logout = useCallback(() => {
    setToken('');
    setAdmin(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
  }, []);

  return (
    <AuthContext.Provider value={{ token, admin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
