import { LogOut } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Logo } from '../components/Logo';
import { VideoBackdrop } from '../components/VideoBackdrop';
import { AcademyProgressProvider } from '../features/academy/AcademyProgressContext';
import { useAuth } from '../features/auth/AuthContext';
import { AstronautAvatar } from '../features/profile/AstronautAvatar';
import { NAV_ITEMS } from './navigation';

/**
 * The frame around every signed-in page.
 * Wide screens get a side rail; phones get a top bar and a bottom tab bar
 * that is easy to reach with thumbs.
 */
export function AppLayout() {
  const { profile, logout } = useAuth();
  // The game fills the whole screen; every other page sits in a centred column.
  const { pathname } = useLocation();
  const fullScreen = pathname === '/mission';

  return (
    <div className="lg:flex">
      {/* The moving galaxy sits behind Mission Control, the app's lobby. */}
      {pathname === '/' && <VideoBackdrop />}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-star focus:px-5 focus:py-3 focus:font-semibold focus:text-void"
      >
        Skip to main content
      </a>

      {/* Side rail (wide screens) */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r-2 border-line bg-hull/80 p-6 backdrop-blur lg:flex">
        <Logo />
        <nav aria-label="Main" className="mt-10 flex-1">
          <ul className="space-y-2">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex min-h-12 items-center gap-3 rounded-2xl border-l-4 px-4 py-3 font-display text-lg font-medium transition ${
                      isActive
                        ? 'border-nola bg-panel text-star'
                        : 'border-transparent text-mist hover:bg-panel/60 hover:text-star'
                    }`
                  }
                >
                  <Icon aria-hidden="true" size={24} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="rounded-2xl border-2 border-line bg-void/50 p-4">
          <div className="flex items-center gap-3">
            {profile && <AstronautAvatar avatar={profile.avatar} size={44} className="shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm text-mist">Signed in as</p>
              <p className="truncate font-display text-lg font-semibold">{profile?.displayName ?? '…'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-line font-semibold text-mist transition hover:border-glow hover:text-star"
          >
            <LogOut aria-hidden="true" size={18} />
            Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar (phones) */}
        <header className="flex items-center justify-between border-b-2 border-line bg-hull/80 px-4 py-3 backdrop-blur lg:hidden">
          <Logo />
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Log out"
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-line text-mist"
          >
            <LogOut aria-hidden="true" size={20} />
          </button>
        </header>

        <main
          id="main"
          tabIndex={-1}
          className={fullScreen ? 'h-[calc(100dvh-8.75rem)] outline-none lg:h-dvh' : 'mx-auto max-w-5xl px-4 pb-32 pt-6 outline-none sm:px-8 lg:py-10'}
        >
          <AcademyProgressProvider>
            <Outlet />
          </AcademyProgressProvider>
        </main>
      </div>

      {/* Bottom tab bar (phones) */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-hull/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {NAV_ITEMS.map(({ to, label, shortLabel, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                aria-label={label}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-1 border-t-4 text-xs font-bold ${
                    isActive ? 'border-nola text-star' : 'border-transparent text-mist'
                  }`
                }
              >
                <Icon aria-hidden="true" size={24} />
                {shortLabel}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
