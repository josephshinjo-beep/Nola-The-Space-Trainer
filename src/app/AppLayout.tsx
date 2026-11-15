import { Database, FlaskConical, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { Logo } from '../components/Logo';
import { AcademyProgressProvider } from '../features/academy/AcademyProgressContext';
import { useAuth } from '../features/auth/AuthContext';
import { GuestModal } from '../features/auth/GuestMode';
import { AstronautAvatar } from '../features/profile/AstronautAvatar';
import { ImmersiveContext } from './immersive';
import { MuteButton } from '../features/audio/MuteButton';
import { NAV_ITEMS } from './navigation';

/**
 * The frame around every signed-in page.
 * Wide screens get a slim icon rail that opens on hover; phones get a top bar and a bottom tab bar
 * that is easy to reach with thumbs.
 */
/** One row of the side rail: an oval icon button when closed, a full-width pill with its label when open. */
const RAIL_ITEM = 'flex h-14 items-center gap-4 rounded-full pl-5 pr-4 transition-colors';
/** Labels stay in the page for screen readers and fade in when the rail opens. */
const RAIL_LABEL =
  'whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100 group-hover/rail:delay-100 group-focus-within/rail:opacity-100';

export function AppLayout() {
  const { profile, logout, isGuest } = useAuth();
  const [guestOpen, setGuestOpen] = useState(false);
  // A guest cannot log back in to a temporary account, so "log out" opens the guest options instead.
  const signOut = () => (isGuest ? setGuestOpen(true) : void logout());
  // While the station game runs it fills the whole screen with no side panel or tab bars;
  // every other page (the locked mission screen too) sits in a centred column.
  const [fullScreen, setFullScreen] = useState(false);

  return (
    <AcademyProgressProvider>
    <ImmersiveContext value={setFullScreen}>
    <div className="lg:flex">
      {/* The moving galaxy sits behind Mission Control, the app's lobby. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-star focus:px-5 focus:py-3 focus:font-semibold focus:text-void"
      >
        Skip to main content
      </a>

      {/* Side rail (wide screens): a slim strip of icons that opens into the full list on hover or keyboard focus. Hidden in the game. */}
      {!fullScreen && (
        <aside
          aria-label="Side panel"
          className="group/rail fixed bottom-3 left-3 top-3 z-40 hidden w-22 flex-col overflow-hidden rounded-[2.25rem] border-2 border-line bg-hull/85 px-3 py-5 shadow-2xl shadow-void/60 backdrop-blur transition-[width] duration-300 ease-out hover:w-72 focus-within:w-72 lg:flex"
        >
          <Link to="/" aria-label="NOLA Space Trainer, Mission Control" className="flex shrink-0 whitespace-nowrap pl-[0.6875rem]">
            <Logo className="[&>span:last-child]:opacity-0 [&>span:last-child]:transition-opacity group-hover/rail:[&>span:last-child]:opacity-100 group-focus-within/rail:[&>span:last-child]:opacity-100" />
          </Link>
          <nav aria-label="Main" className="mt-8 flex-1">
            <ul className="space-y-2">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === '/'}
                    title={label}
                    className={({ isActive }) =>
                      `${RAIL_ITEM} font-display text-lg font-medium ${
                        isActive ? 'bg-nola text-void shadow-lg shadow-nola/30' : 'text-mist hover:bg-panel hover:text-star'
                      }`
                    }
                  >
                    <Icon aria-hidden="true" size={24} className="shrink-0" />
                    <span className={RAIL_LABEL}>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <MuteButton variant="rail" className={`${RAIL_ITEM} h-12 w-full text-sm font-semibold text-mist hover:bg-panel hover:text-star aria-pressed:text-alert`} labelClassName={RAIL_LABEL} />
          <Link to="/data-sources" title="Data sources" className={`${RAIL_ITEM} h-12 text-sm font-semibold text-mist hover:bg-panel hover:text-star`}>
            <Database aria-hidden="true" size={22} className="shrink-0" />
            <span className={RAIL_LABEL}>Data sources</span>
          </Link>
          <div className="mt-2 border-t-2 border-line pt-3">
            <div className="flex items-center gap-3 pl-[0.625rem]">
              {profile && <AstronautAvatar avatar={profile.avatar} size={44} className="shrink-0" />}
              <div className={`min-w-0 ${RAIL_LABEL}`}>
                <p className="text-sm text-mist">{isGuest ? 'Exploring as a guest' : 'Signed in as'}</p>
                <p className="truncate font-display text-lg font-semibold">{profile?.displayName ?? '…'}</p>
              </div>
            </div>
            {isGuest && (
              <button type="button" onClick={() => setGuestOpen(true)} title="Guest mode (test)" className={`${RAIL_ITEM} mt-2 h-12 w-full border-2 border-glow bg-glow/10 font-semibold`}>
                <FlaskConical aria-hidden="true" size={20} className="shrink-0" />
                <span className={RAIL_LABEL}>Guest mode (test)</span>
              </button>
            )}
            <button type="button" onClick={signOut} title={isGuest ? 'Leave guest mode' : 'Log out'} className={`${RAIL_ITEM} mt-2 h-12 w-full font-semibold text-mist hover:bg-panel hover:text-star`}>
              <LogOut aria-hidden="true" size={20} className="shrink-0" />
              <span className={RAIL_LABEL}>{isGuest ? 'Leave guest mode' : 'Log out'}</span>
            </button>
          </div>
        </aside>
      )}

      <div className={`min-w-0 flex-1 ${fullScreen ? '' : 'lg:pl-28'}`}>
        {/* Top bar (phones) */}
        {!fullScreen && (
        <header className="flex items-center justify-between border-b-2 border-line bg-hull/80 px-4 py-3 backdrop-blur lg:hidden">
          <Logo />
          {isGuest && (
            <button type="button" onClick={() => setGuestOpen(true)} className="ml-auto mr-2 flex h-12 items-center gap-2 rounded-full border-2 border-glow bg-glow/10 px-3 text-sm font-bold">
              <FlaskConical aria-hidden="true" size={18} /> Guest
            </button>
          )}
          <MuteButton className={isGuest ? 'mr-2' : 'ml-auto mr-2'} />
          <button
            type="button"
            onClick={signOut}
            aria-label={isGuest ? 'Leave guest mode' : 'Log out'}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-line text-mist"
          >
            <LogOut aria-hidden="true" size={20} />
          </button>
        </header>
        )}

        <main
          id="main"
          tabIndex={-1}
          className={fullScreen ? 'h-dvh outline-none' : 'mx-auto max-w-5xl px-4 pb-32 pt-6 outline-none sm:px-8 lg:py-10'}
        >
          <Outlet />
        </main>
      </div>

      {/* Bottom tab bar (phones); the game has its own menu button instead. */}
      {!fullScreen && (
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
      )}
    </div>
      <GuestModal open={guestOpen} onClose={() => setGuestOpen(false)} />
    </ImmersiveContext>
    </AcademyProgressProvider>
  );
}
