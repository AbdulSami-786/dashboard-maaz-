import { useState, type FormEvent } from 'react';
import { Lock, User, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isChecking, error } = useAuth();
  const [username, setUsername] = useState('');
  const [key, setKey] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !key.trim()) return;
    login(username.trim(), key.trim());
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-0)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand)] text-white">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">MD Fashion</h1>
            <p className="text-sm text-[var(--text-secondary)]">Admin dashboard</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-sm"
        >
          <label htmlFor="adminUsername" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
            Username
          </label>
          <div className="relative mb-4">
            <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              id="adminUsername"
              type="text"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your admin username"
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
            />
          </div>

          <label htmlFor="adminKey" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
            Password
          </label>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              id="adminKey"
              type="password"
              autoComplete="current-password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter your admin password"
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
            />
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-[var(--status-critical)]/10 px-3 py-2 text-sm text-[var(--status-critical)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isChecking || !username.trim() || !key.trim()}
            className="mt-4 w-full rounded-lg bg-[var(--brand)] py-2.5 text-sm font-medium text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isChecking ? 'Checking…' : 'Sign in'}
          </button>

          <p className="mt-4 text-center text-xs leading-relaxed text-[var(--text-muted)]">
            Default credentials are set by running <code>setAdminKey()</code> in
            the Apps Script project, then editable from the Settings sheet or
            the dashboard's Settings page.
          </p>
        </form>
      </div>
    </div>
  );
}