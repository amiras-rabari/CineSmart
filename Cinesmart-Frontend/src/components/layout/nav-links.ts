// Links shared by the desktop nav, MobileNav and UserMenu ([COMP-1]).
import {
  Bookmark,
  CalendarDays,
  Compass,
  Languages,
  Tags,
  Home,
  LogIn,
  Sparkles,
  Star,
  Trophy,
  User,
  UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavLinkItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Only shown when signed in. */
  auth?: boolean;
  end?: boolean;
  /** Navigation state (e.g. which /browse filter to focus); such links are never styled active. */
  state?: unknown;
}

/** Main nav. On desktop the Browse link is the Browse menu; MobileNav flattens it to BROWSE_LINKS. */
export const MAIN_LINKS: NavLinkItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/browse', label: 'Browse', icon: Compass },
  { to: '/lists/imdb-top-250', label: 'IMDb Top 250', icon: Trophy },
  { to: '/watchlist', label: 'Watchlist', icon: Bookmark, auth: true },
];

/** Browse entries for MobileNav ([COMP-1]): the menu's submenus become "focus this filter" links. */
export const BROWSE_LINKS: NavLinkItem[] = [
  { to: '/browse', label: 'Browse all movies', icon: Compass },
  { to: '/browse', label: 'Browse by genre', icon: Tags, state: { focus: 'genre' } },
  { to: '/browse', label: 'Browse by language', icon: Languages, state: { focus: 'language' } },
  { to: '/browse', label: 'Browse by year', icon: CalendarDays, state: { focus: 'year' } },
];

export const ACCOUNT_LINKS: NavLinkItem[] = [
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/watchlist', label: 'My watchlist', icon: Bookmark },
  { to: '/ratings', label: 'My ratings', icon: Star },
  { to: '/for-you', label: 'For You', icon: Sparkles },
];

export const GUEST_LINKS: NavLinkItem[] = [
  { to: '/login', label: 'Sign in', icon: LogIn },
  { to: '/signup', label: 'Sign up', icon: UserPlus },
];
