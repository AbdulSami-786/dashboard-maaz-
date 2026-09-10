import { NavLink, Outlet } from 'react-router-dom';
import { Heart, LayoutDashboard, LogOut, Package, ShoppingBag, Star, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Orders', icon: Package, end: false },
  { to: '/reviews', label: 'Reviews', icon: Star, end: false },
  { to: '/customers', label: 'Customers', icon: Users, end: false },
  { to: '/wishlist', label: 'Wishlist', icon: Heart, end: false },
  { to: '/settings', label: 'Settings', icon: Heart, end: false },
];

export default function Layout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--surface-0)] md:flex">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-1)] md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand)] text-white">
            <ShoppingBag size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">MD Fashion</p>
            <p className="text-xs text-[var(--text-muted)]">Admin dashboard</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-[var(--brand)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]',
                )
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[var(--border)] p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-2)] hover:text-[var(--status-critical)]"
          >
            <LogOut size={17} />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-1)]/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] text-white">
              <ShoppingBag size={16} />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">MD Fashion Admin</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--status-critical)]"
            aria-label="Log out"
          >
            <LogOut size={18} />
          </button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 md:hidden">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-[var(--brand)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]',
                )
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
