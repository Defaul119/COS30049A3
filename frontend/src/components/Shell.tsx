import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useServiceStatus } from '../hooks/useServiceStatus';
import { useSettings } from '../hooks/useSettings';
import { useToasts } from '../hooks/useToasts';
import { formatDay } from '../lib/dates';
import { paths, useRoute } from '../lib/router';
import { HeaderSearch } from './HeaderSearch';
import { Icon } from './Icon';
import { MainNav } from './MainNav';
import { OfflineBanner } from './OfflineBanner';
import { ServiceStatus } from './ServiceStatus';
import { ThemeSwitch } from './ThemeSwitch';

/** Tells the user when the service drops out or returns, since that can happen while they read. */
function useStatusToasts(): void {
  const { state } = useServiceStatus();
  const { notify } = useToasts();
  const previous = useRef(state);

  useEffect(() => {
    const was = previous.current;
    previous.current = state;
    if (state === 'ready' && (was === 'unreachable' || was === 'starting')) {
      notify({ tone: 'success', message: 'The explorer service is back.' });
    } else if (state === 'unreachable' && was === 'ready') {
      notify({ tone: 'error', message: 'The explorer service stopped responding.' });
    }
  }, [state, notify]);
}

/** The frame around every view: skip link, header, main region, footer (plan section 8). */
export function Shell({ children }: { children: ReactNode }) {
  const route = useRoute();
  const { settings } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  useStatusToasts();

  // On a phone the menu closes once a link has been followed.
  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener('hashchange', close);
    return () => window.removeEventListener('hashchange', close);
  }, []);

  const { snapshot } = settings;

  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <OfflineBanner />
      <header className="app-header">
        <div className="container header-inner">
          <a className="brand" href={paths.select()}>
            <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="7" />
              <rect x="6" y="16" width="4" height="10" rx="1" className="brand-bar" />
              <rect x="14" y="10" width="4" height="16" rx="1" className="brand-bar" />
              <rect x="22" y="6" width="4" height="20" rx="1" className="brand-bar brand-bar-flag" />
            </svg>
            <span className="brand-name">Bitcoin Address Activity Explorer</span>
          </a>
          <HeaderSearch />
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
          <MainNav id="main-nav" route={route} open={menuOpen} />
        </div>
        <div className="header-bar">
          <div className="container header-bar-inner">
            {snapshot ? (
              <p className="header-meta">
                Snapshot of {formatDay(snapshot.snapshotDate)} · {snapshot.source} · days in UTC
              </p>
            ) : null}
            <ServiceStatus />
            <ThemeSwitch />
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="container">
        {children}
      </main>

      <footer className="app-footer">
        <div className="container footer-inner">
          <p className="footer-limitation">
            <Icon name="info" /> {settings.limitationLine}
          </p>
          <p>
            Unusual means different from the same address's own earlier activity. Days and times are in UTC. COS30049
            Computing Technology Innovation Project, group HCMC_COS30049.1_4.
          </p>
        </div>
      </footer>
    </>
  );
}
