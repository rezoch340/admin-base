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

const MANAGEMENT_ENTRIES = [
  {
    href: '/users',
    title: '后台账号',
    description: '管理账号资料、启用状态和用户权限组。',
    subject: 'user',
    icon: Users,
  },
  {
    href: '/permission-groups',
    title: '权限组',
    description: '维护权限目录，按角色分配操作与资源权限。',
    subject: 'rbac',
    icon: ShieldCheck,
  },
  {
    href: '/system-logs',
    title: '系统日志',
    description: '查看登录、后台访问和管理操作的审计记录。',
    subject: 'system-log',
    icon: FileClock,
  },
];

export default function DashboardPage() {
  const { user, can, isRoot } = useAuthentication();
  const visibleEntries = MANAGEMENT_ENTRIES.filter((entry) =>
    can('read', entry.subject),
  );

  return (
    <>
      <PageHeader
        eyebrow="Admin Base"
        title="后台首页"
        description={`欢迎，${user?.username ?? ''}。从这里进入账号、权限和系统日志管理。`}
      />
      <Card>
        <CardHeader>
          <CardTitle>当前账号</CardTitle>
          <CardDescription>
            {isRoot ? '种子管理员拥有全部后台管理权限。' : '以下入口根据你的账号权限显示。'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {visibleEntries.length > 0
            ? '选择一个管理入口开始工作。'
            : '当前账号尚未分配管理权限，请联系管理员。'}
        </CardContent>
      </Card>
      <section className="grid gap-4 md:grid-cols-3" aria-label="管理入口">
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
                  <CardTitle>{entry.title}</CardTitle>
                  <CardDescription>{entry.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </section>
    </>
  );
}
