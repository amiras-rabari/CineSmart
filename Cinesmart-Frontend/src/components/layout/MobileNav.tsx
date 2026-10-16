import { LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { signOut } from '@/session/session-manager';
import { useSession } from '@/session/session-store';
import {
  ACCOUNT_LINKS,
  BROWSE_LINKS,
  GUEST_LINKS,
  MAIN_LINKS,
  type NavLinkItem,
} from './nav-links';

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
}

/** Sheet from the right with the main (Browse flattened) and account links; closes on navigation ([COMP-1]). */
export function MobileNav({ open, onOpenChange, onCloseAutoFocus }: MobileNavProps) {
  const { status, user } = useSession();
  const navigate = useNavigate();
  const signedIn = status === 'authenticated';
  const close = () => onOpenChange(false);

  async function handleSignOut() {
    close();
    await signOut();
    void navigate('/');
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[85vw] max-w-xs gap-0 bg-surface p-0"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <SheetHeader className="border-b p-4">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription className={signedIn ? undefined : 'sr-only'}>
            {signedIn ? `Signed in as ${user?.username}` : 'Site navigation'}
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile" className="flex flex-col gap-1 overflow-y-auto p-2">
          <LinkList
            links={MAIN_LINKS.filter((link) => !link.auth || signedIn).flatMap((link) =>
              link.to === '/browse' ? BROWSE_LINKS : [link],
            )}
            onNavigate={close}
          />
          <Separator className="my-2" />
          <LinkList links={signedIn ? ACCOUNT_LINKS : GUEST_LINKS} onNavigate={close} />
          {signedIn && (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function LinkList({ links, onNavigate }: { links: NavLinkItem[]; onNavigate: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {links.map(({ to, label, icon: Icon, end, state }) => (
        <li key={`${to}-${label}`}>
          <NavLink
            to={to}
            end={end}
            state={state}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                isActive && !state
                  ? 'bg-surface-2 text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
