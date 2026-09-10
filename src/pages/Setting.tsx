import { useState, type FormEvent } from 'react';
import { Lock, User, Save } from 'lucide-react';
import { updateAdminCredentials, getStoredAdminUsername, ApiError } from '../lib/api';

export default function Settings() {
  const [username, setUsername] = useState(getStoredAdminUsername() || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username is required.');
      setStatus('error');
      return;
    }
    if (password && password.length < 6) {
      setError('Password must be at least 6 characters.');
      setStatus('error');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setStatus('error');
      return;
    }

    setStatus('saving');
    try {
      await updateAdminCredentials(username.trim(), password);
      setPassword('');
      setConfirmPassword('');
      setStatus('saved');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-xl font-semibold text-[var(--text-primary)]">Settings</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Update the username and password used to sign in to this dashboard.
      </p>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-sm"
      >
        <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Username
        </label>
        <div className="relative mb-4">
          <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
          />
        </div>

        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          New password
        </label>
        <div className="relative mb-4">
          <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
          />
        </div>

        <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Confirm new password
        </label>
        <div className="relative">
          <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            disabled={!password}
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] disabled:opacity-50"
          />
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-[var(--status-critical)]/10 px-3 py-2 text-sm text-[var(--status-critical)]">
            {error}
          </p>
        )}
        {status === 'saved' && (
          <p className="mt-3 rounded-lg bg-green-600/10 px-3 py-2 text-sm text-green-600">
            Credentials updated.
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'saving'}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] py-2.5 text-sm font-medium text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={16} />
          {status === 'saving' ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}