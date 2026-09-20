'use client';

import Link from 'next/link';
import { ArrowUpRight, FileClock, ShieldCheck, Users } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuthentication } from '@/lib/auth';
import { useI18n, type MessageKey } from '@/lib/i18n';

const MANAGEMENT_ENTRIES: Array<{
  href: string;
  title: MessageKey;
  description: MessageKey;
  subject: string;
  icon: typeof Users;
}> = [
  {
    href: '/users',
    title: 'nav.users',
    description: 'home.usersDescription',
    subject: 'user',
    icon: Users,
  },
  {
    href: '/permission-groups',
    title: 'nav.permissionGroups',
    description: 'home.permissionGroupsDescription',
    subject: 'rbac',
    icon: ShieldCheck,
  },
  {
    href: '/system-logs',
    title: 'nav.systemLogs',
    description: 'home.systemLogsDescription',
    subject: 'system-log',
    icon: FileClock,
  },
];

export default function DashboardPage() {
  const { user, can, isRoot } = useAuthentication();
  const { translate } = useI18n();
  const visibleEntries = MANAGEMENT_ENTRIES.filter((entry) =>
    can('read', entry.subject),
  );

  return (
    <>
      <PageHeader
        eyebrow="Admin Base"
        title={translate('nav.home')}
        description={translate('home.welcome', {
          username: user?.username ?? '',
        })}
      />
      <Card>
        <CardHeader>
          <CardTitle>{translate('home.currentAccount')}</CardTitle>
          <CardDescription>
            {isRoot
              ? translate('home.rootHint')
              : translate('home.permissionHint')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {visibleEntries.length > 0
            ? translate('home.pickEntry')
            : translate('home.noPermission')}
        </CardContent>
      </Card>
      <section className="grid gap-4 md:grid-cols-3" aria-label={translate('home.entries')}>
        {visibleEntries.map((entry) => {
          const EntryIcon = entry.icon;
          return (
            <Link key={entry.href} href={entry.href}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between text-primary">
                    <EntryIcon className="size-6" />
                    <ArrowUpRight className="size-4" />
                  </div>
                  <CardTitle>{translate(entry.title)}</CardTitle>
                  <CardDescription>
                    {translate(entry.description)}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </section>
    </>
  );
}
