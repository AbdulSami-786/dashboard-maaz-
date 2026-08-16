import { createContext, useContext, useState, type ReactNode } from 'react';
import { ApiError, clearStoredAdminKey, getStoredAdminKey, setStoredAdminKey, verifyAdminKey } from '../lib/api';

interface AuthContextValue {
  isAuthed: boolean;
  isChecking: boolean;
  error: string | null;
  login: (key: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(() => Boolean(getStoredAdminKey()));
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(key: string) {
    setIsChecking(true);
    setError(null);
    setStoredAdminKey(key);
    try {
      await verifyAdminKey(key);
      setIsAuthed(true);
    } catch (err) {
      clearStoredAdminKey();
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection and try again.');
      setIsAuthed(false);
    } finally {
      setIsChecking(false);
    }
  }

  function logout() {
    clearStoredAdminKey();
    setIsAuthed(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthed, isChecking, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
