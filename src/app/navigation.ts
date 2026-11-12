import { Bot, GraduationCap, LayoutDashboard, Rocket, UserRound, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  /** Full name, used on wide screens and for screen readers. */
  label: string;
  /** Short name for the mobile tab bar. */
  shortLabel: string;
  icon: LucideIcon;
}

/** The five main modules. Navigation and Mission Control both read this list. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Mission Control', shortLabel: 'Control', icon: LayoutDashboard },
  { to: '/academy', label: 'NOLA Academy', shortLabel: 'Academy', icon: GraduationCap },
  { to: '/mission', label: 'NOLA Mission', shortLabel: 'Mission', icon: Rocket },
  { to: '/companion', label: 'Meet NOLA', shortLabel: 'NOLA', icon: Bot },
  { to: '/profile', label: 'Astronaut Profile', shortLabel: 'Profile', icon: UserRound },
];
