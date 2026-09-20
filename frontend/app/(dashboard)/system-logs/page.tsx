'use client';

import { useState } from 'react';
import { ChevronDown, Eye } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { FilterBar, type FilterFieldDefinition } from '@/components/filter-bar';
import { JsonBlock } from '@/components/json-block';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { PermissionBoundary } from '@/components/permission-boundary';
import { QueryErrorState } from '@/components/query-state';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/format';
import type { SystemLogRecord } from '@/lib/models';
import { toIsoDateRange, useServerTable } from '@/lib/use-server-table';
import { combineClassNames } from '@/lib/utils';

interface SystemLogFilters {
  name: string;
  actorUsername: string;
  action: string;
  subject: string;
  targetType: string;
  targetName: string;
  status: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: SystemLogFilters = {
  name: '',
  actorUsername: '',
  action: '',
  subject: '',
  targetType: '',
  targetName: '',
  status: '',
  from: '',
  to: '',
};

// 常用的放工具栏,动作/资源/目标这几个技术字段收进高级筛选
const FILTER_FIELDS: Array<FilterFieldDefinition<keyof SystemLogFilters>> = [
  { key: 'name', label: '事件', placeholder: '事件名称' },
  { key: 'actorUsername', label: '操作者', placeholder: '用户名' },
  {
    key: 'status',
    label: '结果',
    type: 'select',
    placeholder: '全部结果',
    options: [
      { value: 'succeeded', label: '成功' },
      { value: 'failed', label: '失败' },
    ],
  },
  { key: 'from', label: '起始时间', type: 'datetime-local' },
  { key: 'to', label: '结束时间', type: 'datetime-local' },
  { key: 'action', label: '动作', placeholder: 'read、create…' },
  { key: 'subject', label: '资源', placeholder: 'user、rbac…' },
  { key: 'targetType', label: '目标类型', placeholder: '目标类型' },
  { key: 'targetName', label: '目标名称', placeholder: '目标名称' },
];
const ADVANCED_KEYS: Array<keyof SystemLogFilters> = [
  'action',
  'subject',
  'targetType',
  'targetName',
];

// datetime-local 要的是本地时间、不带时区的 ISO 前 16 位
function toLocalInput(date: Date): string {
  const offsetMinutes = date.getTimezoneOffset();
  return new Date(date.getTime() - offsetMinutes * 60_000).toISOString().slice(0, 16);
}

const QUICK_RANGES: Array<{ label: string; range: () => { from: string; to: string } }> = [
  {
    label: '最近 1 小时',
    range: () => {
      const now = new Date();
      return { from: toLocalInput(new Date(now.getTime() - 3_600_000)), to: toLocalInput(now) };
    },
  },
  {
    label: '今天',
    range: () => {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: toLocalInput(start), to: toLocalInput(now) };
    },
  },
  {
    label: '最近 7 天',
    range: () => {
      const now = new Date();
      return {
        from: toLocalInput(new Date(now.getTime() - 7 * 86_400_000)),
        to: toLocalInput(now),
      };
    },
  },
];

const TIMEZONE_LABEL = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return '本地时间';
  }
})();

function hasAnyFilter(filters: SystemLogFilters): boolean {
  return Object.values(filters).some((value) => value !== '');
}

export default function SystemLogsPage() {
  const [selectedLog, setSelectedLog] = useState<SystemLogRecord | null>(null);
  const table = useServerTable<SystemLogRecord, SystemLogFilters>({
    resourceKey: 'system-logs',
    endpoint: '/system-logs',
    emptyFilters: EMPTY_FILTERS,
    transformFilters: toIsoDateRange,
  });
  const isFiltered = hasAnyFilter(table.filters.applied);

  // 事件、目标、操作者、结果、时间优先;动作/资源已在事件里,放最后当辅助
  const columns: Array<DataTableColumn<SystemLogRecord>> = [
    {
      key: 'event',
      header: '事件 / 目标',
      className: 'min-w-0',
      render: (systemLog) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={systemLog.name}>
            {systemLog.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            <TargetLabel systemLog={systemLog} />
          </p>
        </div>
      ),
    },
    {
      key: 'actor',
      header: '操作者',
      className: 'w-28',
      render: (systemLog) => (
        <span className="block truncate font-mono text-xs" title={systemLog.actorUsername}>
          {systemLog.actorUsername}
        </span>
      ),
    },
    {
      key: 'status',
      header: '结果',
      className: 'w-20',
      render: (systemLog) => <StatusBadge status={systemLog.status} />,
    },
    {
      key: 'time',
      header: '时间',
      className: 'w-40',
      render: (systemLog) => (
        <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
          {formatDateTime(systemLog.createdAt)}
        </span>
      ),
    },
    {
      key: 'action',
      header: '动作 / 资源',
      className: 'hidden w-32 xl:table-cell',
      render: (systemLog) => (
        <span className="block truncate font-mono text-xs text-muted-foreground">
          {systemLog.action}/{systemLog.subject}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12 text-center',
      render: (systemLog) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`查看 ${systemLog.name} 详情`}
          onClick={() => setSelectedLog(systemLog)}
        >
          <Eye />
        </Button>
      ),
    },
  ];

  return (
    <PermissionBoundary action="read" subject="system-log">
      <PageHeader
        eyebrow="Administrator audit"
        title="系统日志"
        description="不可变记录登录、控制面读取、拒绝访问和业务写入,回答谁在什么时候访问或修改了什么。"
      />
      <FilterBar
        fields={FILTER_FIELDS}
        advancedKeys={ADVANCED_KEYS}
        {...table.filterBarProps}
        extra={
          <span className="flex flex-wrap items-center gap-1.5">
            {QUICK_RANGES.map((quick) => (
              <Button
                key={quick.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => table.filters.applyPatch(quick.range())}
              >
                {quick.label}
              </Button>
            ))}
            <span className="ml-1 text-xs text-muted-foreground">时间按 {TIMEZONE_LABEL} 显示</span>
          </span>
        }
      />
      {table.isError ? (
        <QueryErrorState onRetry={() => table.filterBarProps.onSubmit()} />
      ) : null}
      <DataTable
        columns={columns}
        {...table.tableProps}
        emptyMessage={isFiltered ? '没有匹配的日志' : '还没有系统日志'}
        rowKey={(systemLog) => systemLog.id}
        bodyMaxHeight="max-h-[calc(100vh-24rem)]"
        footer={
          <div className="flex flex-wrap items-center gap-3">
            {isFiltered && table.tableProps.rows.length === 0 && (
              <Button variant="ghost" size="sm" onClick={table.filterBarProps.onReset}>
                清除筛选条件
              </Button>
            )}
            <div className="ml-auto">
              <Pagination {...table.paginationProps} />
            </div>
          </div>
        }
        tableClassName="min-w-[760px] table-fixed"
      />

      <Dialog
        open={selectedLog !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null);
        }}
      >
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {selectedLog?.name ?? '系统日志详情'}
              {selectedLog && <StatusBadge status={selectedLog.status} />}
            </DialogTitle>
            <DialogDescription>{selectedLog?.description ?? ''}</DialogDescription>
          </DialogHeader>
          {selectedLog ? <LogDetail systemLog={selectedLog} /> : null}
        </DialogContent>
      </Dialog>
    </PermissionBoundary>
  );
}

// 有名字给名字,没有就老实给 ID,不猜
function TargetLabel({ systemLog }: { systemLog: SystemLogRecord }) {
  if (!systemLog.targetType) return <>—</>;
  const identity = systemLog.targetName
    ? systemLog.targetName
    : systemLog.targetId
      ? `#${systemLog.targetId}`
      : null;
  return (
    <>
      <span className="font-mono">{systemLog.targetType}</span>
      {identity && (
        <>
          {' · '}
          <span className={systemLog.targetName ? undefined : 'font-mono'}>{identity}</span>
          {systemLog.targetName && systemLog.targetId && (
            <span className="font-mono"> #{systemLog.targetId}</span>
          )}
        </>
      )}
    </>
  );
}

// 详情:先讲人事时结果,失败原因突出;请求那组技术信息放一起;空元数据折起来
function LogDetail({ systemLog }: { systemLog: SystemLogRecord }) {
  const hasMetadata = Object.keys(systemLog.metadata ?? {}).length > 0;
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  return (
    <div className="space-y-4">
      {systemLog.status === 'failed' && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <p className="text-xs font-medium">失败原因</p>
          <p className="mt-0.5 break-all font-mono text-xs">
            {systemLog.errorMessage || `HTTP ${systemLog.statusCode}`}
          </p>
        </div>
      )}
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <DetailItem label="操作者" value={systemLog.actorUsername} mono />
        <DetailItem label="时间" value={formatDateTime(systemLog.createdAt)} mono />
        <DetailItem label="动作 / 资源" value={`${systemLog.action}/${systemLog.subject}`} mono />
        <DetailItem label="目标" value={<TargetLabel systemLog={systemLog} />} />
      </dl>
      <section className="rounded-lg border">
        <p className="border-b px-3 py-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          请求
        </p>
        <dl className="grid gap-x-6 gap-y-2 p-3 text-xs sm:grid-cols-2">
          <DetailItem
            label="方法 · 状态"
            value={
              <span className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {systemLog.method}
                </Badge>
                <span
                  className={combineClassNames(
                    'font-mono',
                    systemLog.statusCode >= 400 && 'text-destructive',
                  )}
                >
                  {systemLog.statusCode}
                </span>
              </span>
            }
          />
          <DetailItem label="IP" value={systemLog.ipAddress || '—'} mono />
          <DetailItem label="路由" value={systemLog.route} mono className="sm:col-span-2" />
          {systemLog.userAgent && (
            <DetailItem
              label="User-Agent"
              value={systemLog.userAgent}
              mono
              className="sm:col-span-2"
            />
          )}
        </dl>
      </section>
      {hasMetadata ? (
        <JsonBlock title="安全元数据" value={systemLog.metadata} />
      ) : (
        <button
          type="button"
          aria-expanded={isMetadataOpen}
          onClick={() => setIsMetadataOpen((current) => !current)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={combineClassNames('size-3.5 transition-transform', isMetadataOpen && 'rotate-180')}
          />
          安全元数据(空)
        </button>
      )}
      {!hasMetadata && isMetadataOpen && (
        <code className="block rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
          {'{}'}
        </code>
      )}
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={combineClassNames('min-w-0', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={combineClassNames('mt-0.5 break-all', mono && 'font-mono text-xs')}>
        {value}
      </dd>
    </div>
  );
}
