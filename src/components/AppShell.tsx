import { NavLink, Outlet } from 'react-router-dom';
import { usePersistence } from '../app/persistence';
import { useThemeClass } from '../app/useThemeClass';
import type { ThemePreference } from '../types/persistence';

function ThemeSync() {
  const { state } = usePersistence();
  useThemeClass(state.theme);
  return null;
}

export function AppShell() {
  const { state, setTheme } = usePersistence();

  const cycleTheme = () => {
    const order: ThemePreference[] = ['system', 'light', 'dark'];
    const i = order.indexOf(state.theme);
    setTheme(order[(i + 1) % order.length] ?? 'system');
  };

  return (
    <>
      <ThemeSync />
      <header className="nav">
        <div className="nav-inner">
          <NavLink to="/" className="nav-brand">
            NHL Franchise History
          </NavLink>
          <nav className="nav-links" aria-label="Main">
            <NavLink className="nav-link" to="/franchises">
              Franchises
            </NavLink>
            <NavLink className="nav-link" to="/conn-smythe">
              Conn Smythe
            </NavLink>
            <NavLink className="nav-link" to="/playoffs/2026">
              Playoffs ’26
            </NavLink>
            <NavLink className="nav-link" to="/compare">
              Compare
            </NavLink>
            <NavLink className="nav-link" to="/favorites">
              Favorites
            </NavLink>
            <NavLink className="nav-link" to="/about">
              About
            </NavLink>
          </nav>
          <div className="theme-toggle">
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              Theme: {state.theme}
            </span>
            <button type="button" onClick={cycleTheme}>
              Cycle
            </button>
          </div>
        </div>
      </header>
      <main className="shell">
        <Outlet />
      </main>
    </>
  );
}
