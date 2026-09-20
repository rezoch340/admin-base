'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Blocks,
  FileClock,
  LayoutDashboard,
  LogOut,
  KeySquare,
  Menu,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { AccountPasswordDialog } from '@/components/account-password-dialog';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuthentication } from '@/lib/auth';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { combineClassNames } from '@/lib/utils';

interface NavigationItem {
  href: string;
  label: MessageKey;
  icon: typeof LayoutDashboard;
  permission?: {
    action: string;
    subject: string;
  };
}

const NAVIGATION_GROUPS: Array<{
  label: MessageKey;
  items: NavigationItem[];
}> = [
  {
    label: 'nav.group.workspace',
    items: [{ href: '/', label: 'nav.home', icon: LayoutDashboard }],
  },
  {
    label: 'nav.group.accessControl',
    items: [
      {
        href: '/users',
        label: 'nav.users',
        icon: Users,
        permission: { action: 'read', subject: 'user' },
      },
      {
        href: '/permission-groups',
        label: 'nav.permissionGroups',
        icon: ShieldCheck,
        permission: { action: 'read', subject: 'rbac' },
      },
    ],
  },
  {
    label: 'nav.group.audit',
    items: [
      {
        href: '/system-logs',
        label: 'nav.systemLogs',
        icon: FileClock,
        permission: { action: 'read', subject: 'system-log' },
      },
    ],
  },
];

function Brand() {
  return (
    <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
      <span className="relative flex size-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/20">
        <Blocks className="size-5" />
        <span className="signal-pulse absolute -right-0.5 -top-0.5 size-2 rounded-full bg-cyan-300" />
      </span>
      <div>
        <p className="font-heading text-sm font-semibold tracking-[0.16em] text-white">
          Admin Base
        </p>
        <p className="font-mono text-[9px] tracking-[0.18em] text-sidebar-foreground uppercase">
          Admin Console
        </p>
      </div>
    </div>
  );
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can } = useAuthentication();
  const { translate } = useI18n();

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-3">
      {NAVIGATION_GROUPS.map((navigationGroup) => {
        const visibleItems = navigationGroup.items.filter(
          (navigationItem) =>
            !navigationItem.permission ||
            can(
              navigationItem.permission.action,
              navigationItem.permission.subject,
            ),
        );
        if (visibleItems.length === 0) {
          return null;
        }
        return (
          <section key={navigationGroup.label} className="space-y-1">
            <p className="px-3 pb-1 font-mono text-[9px] font-semibold tracking-[0.18em] text-sidebar-foreground/55 uppercase">
              {translate(navigationGroup.label)}
            </p>
            {visibleItems.map((navigationItem) => {
              const isActive =
                navigationItem.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(navigationItem.href);
              const NavigationIcon = navigationItem.icon;
              return (
                <Link
                  key={navigationItem.href}
                  href={navigationItem.href}
                  prefetch
                  onNavigate={() => onNavigate?.()}
                  className={combineClassNames(
                    // 悬停时整项右移一点点,配合颜色过渡,点击有去处的感觉
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200 ease-out',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:translate-x-0.5 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
                  )}
                >
                  <NavigationIcon
                    className={combineClassNames(
                      'size-4 transition-transform duration-200',
                      isActive ? 'scale-110' : '',
                    )}
                  />
                  {translate(navigationItem.label)}
                </Link>
              );
            })}
          </section>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const { user, logout, isRoot, can } = useAuthentication();
  const { translate } = useI18n();
  const pathname = usePathname();
  return (
    <div className="grid h-svh overflow-hidden lg:grid-cols-[230px_1fr]">
      <aside className="hidden flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <Brand />
        <Navigation />
      </aside>

      <Sheet
        open={isMobileNavigationOpen}
        onOpenChange={setIsMobileNavigationOpen}
      >
        <SheetContent
          side="left"
          showCloseButton
          className="gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">{translate('nav.main')}</SheetTitle>
          <SheetDescription className="sr-only">
            {translate('nav.mainDescription')}
          </SheetDescription>
          <Brand />
          <Navigation onNavigate={() => setIsMobileNavigationOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card/85 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={translate('nav.open')}
            onClick={() => setIsMobileNavigationOpen(true)}
          >
            <Menu />
          </Button>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>{translate('app.tagline')}</span>
          </div>
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" className="h-9 gap-2 px-2.5">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserRound className="size-3.5" />
                    </span>
                    <span className="font-mono text-xs">{user?.username}</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem disabled>
                  {isRoot
                    ? translate('account.root')
                    : translate('account.administrator')}
                </DropdownMenuItem>
                {can('update', 'user') ? (
                  <DropdownMenuItem
                    onClick={() => setIsPasswordDialogOpen(true)}
                  >
                    <KeySquare />
                    {translate('account.changeMyPassword')}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={logout}>
                  <LogOut />
                  {translate('account.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {/* key 绑路由:路径一变就重挂,入场动画随之重放。
              motion-safe 让开启「减少动态效果」的系统直接跳过 */}
          <div
            key={pathname}
            className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out"
          >
            {children}
          </div>
        </main>
      </div>
      <AccountPasswordDialog
        key={`account-password-${isPasswordDialogOpen}`}
        open={isPasswordDialogOpen}
        userId={user?.id}
        onClose={() => setIsPasswordDialogOpen(false)}
      />
    </div>
  );
}
