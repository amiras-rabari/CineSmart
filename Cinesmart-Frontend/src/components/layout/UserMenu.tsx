import { ChevronDown, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/session/session-manager';
import { useSession } from '@/session/session-store';
import { ACCOUNT_LINKS } from './nav-links';

/** Avatar + username: Profile, My watchlist, My ratings, For You, Sign out ([COMP-1]). */
export function UserMenu() {
  const { user } = useSession();
  const navigate = useNavigate();
  if (!user) return null;

  async function handleSignOut() {
    await signOut();
    void navigate('/');
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 px-2"
          aria-label={`Account menu for ${user.username}`}
        >
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground uppercase"
          >
            {user.username.charAt(0)}
          </span>
          <span className="hidden max-w-40 truncate sm:inline">{user.username}</span>
          <ChevronDown className="text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel className="truncate">{user.username}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ACCOUNT_LINKS.map(({ to, label, icon: Icon }) => (
          <DropdownMenuItem key={to} asChild>
            <Link to={to}>
              <Icon aria-hidden />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleSignOut()}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
