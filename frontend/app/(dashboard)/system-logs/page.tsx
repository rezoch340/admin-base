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
import { useI18n, type MessageKey, type Translate } from '@/lib/i18n';
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
function filterFields(
  translate: Translate,
): Array<FilterFieldDefinition<keyof SystemLogFilters>> {
  return [
    {
      key: 'name',
      label: translate('systemLogs.event'),
      placeholder: translate('systemLogs.eventPlaceholder'),
    },
    {
      key: 'actorUsername',
      label: translate('systemLogs.actor'),
      placeholder: translate('common.username'),
    },
    {
      key: 'status',
      label: translate('systemLogs.result'),
      type: 'select',
      placeholder: translate('systemLogs.allResults'),
      options: [
        { value: 'succeeded', label: translate('common.succeeded') },
        { value: 'failed', label: translate('common.failed') },
      ],
    },
    { key: 'from', label: translate('systemLogs.from'), type: 'datetime-local' },
    { key: 'to', label: translate('systemLogs.to'), type: 'datetime-local' },
    {
      key: 'action',
      label: translate('permissions.action'),
      placeholder: translate('systemLogs.actionPlaceholder'),
    },
    {
      key: 'subject',
      label: translate('permissions.subject'),
      placeholder: translate('permissions.subjectPlaceholder'),
    },
    {
      key: 'targetType',
      label: translate('systemLogs.targetType'),
      placeholder: translate('systemLogs.targetType'),
    },
    {
      key: 'targetName',
      label: translate('systemLogs.targetName'),
      placeholder: translate('systemLogs.targetName'),
    },
  ];
}
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

const QUICK_RANGES: Array<{ label: MessageKey; range: () => { from: string; to: string } }> = [
  {
    label: 'systemLogs.range.lastHour',
    range: () => {
      const now = new Date();
      return { from: toLocalInput(new Date(now.getTime() - 3_600_000)), to: toLocalInput(now) };
    },
  },
  {
    label: 'systemLogs.range.today',
    range: () => {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: toLocalInput(start), to: toLocalInput(now) };
    },
  },
  {
    label: 'systemLogs.range.last7Days',
    range: () => {
      const now = new Date();
      return {
        from: toLocalInput(new Date(now.getTime() - 7 * 86_400_000)),
        to: toLocalInput(now),
      };
    },
  },
];

// 拿不到时区名时为 null,由页面按当前语言给「本地时间」兜底
const TIMEZONE_NAME: string | null = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
})();

function hasAnyFilter(filters: SystemLogFilters): boolean {
  return Object.values(filters).some((value) => value !== '');
}

export default function SystemLogsPage() {
  const [selectedLog, setSelectedLog] = useState<SystemLogRecord | null>(null);
  const { translate, locale } = useI18n();
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
      header: translate('systemLogs.eventTarget'),
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
      header: translate('systemLogs.actor'),
      className: 'w-28',
      render: (systemLog) => (
        <span className="block truncate font-mono text-xs" title={systemLog.actorUsername}>
          {systemLog.actorUsername}
        </span>
      ),
    },
    {
      key: 'status',
      header: translate('systemLogs.result'),
      className: 'w-20',
      render: (systemLog) => <StatusBadge status={systemLog.status} />,
    },
    {
      key: 'time',
      header: translate('systemLogs.time'),
      className: 'w-40',
      render: (systemLog) => (
        <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
          {formatDateTime(systemLog.createdAt, locale)}
        </span>
      ),
    },
    {
      key: 'action',
      header: translate('systemLogs.actionSubject'),
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
          aria-label={translate('systemLogs.viewDetails', { name: systemLog.name })}
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
        title={translate('nav.systemLogs')}
        description={translate('systemLogs.description')}
      />
      <FilterBar
        fields={filterFields(translate)}
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
                {translate(quick.label)}
              </Button>
            ))}
            <span className="ml-1 text-xs text-muted-foreground">
              {translate('systemLogs.timezoneHint', {
                timezone: TIMEZONE_NAME ?? translate('systemLogs.localTime'),
              })}
            </span>
          </span>
        }
      />
      {table.isError ? (
        <QueryErrorState onRetry={() => table.filterBarProps.onSubmit()} />
      ) : null}
      <DataTable
        columns={columns}
        {...table.tableProps}
        emptyMessage={
          isFiltered
            ? translate('systemLogs.emptyFiltered')
            : translate('systemLogs.empty')
        }
        rowKey={(systemLog) => systemLog.id}
        bodyMaxHeight="max-h-[calc(100vh-24rem)]"
        footer={
          <div className="flex flex-wrap items-center gap-3">
            {isFiltered && table.tableProps.rows.length === 0 && (
              <Button variant="ghost" size="sm" onClick={table.filterBarProps.onReset}>
                {translate('systemLogs.clearFilters')}
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
              {selectedLog?.name ?? translate('systemLogs.detailTitle')}
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
  const { translate, locale } = useI18n();
  const hasMetadata = Object.keys(systemLog.metadata ?? {}).length > 0;
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  return (
    <div className="space-y-4">
      {systemLog.status === 'failed' && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <p className="text-xs font-medium">{translate('systemLogs.failureReason')}</p>
          <p className="mt-0.5 break-all font-mono text-xs">
            {systemLog.errorMessage || `HTTP ${systemLog.statusCode}`}
          </p>
        </div>
      )}
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <DetailItem label={translate('systemLogs.actor')} value={systemLog.actorUsername} mono />
        <DetailItem
          label={translate('systemLogs.time')}
          value={formatDateTime(systemLog.createdAt, locale)}
          mono
        />
        <DetailItem
          label={translate('systemLogs.actionSubject')}
          value={`${systemLog.action}/${systemLog.subject}`}
          mono
        />
        <DetailItem label={translate('systemLogs.target')} value={<TargetLabel systemLog={systemLog} />} />
      </dl>
      <section className="rounded-lg border">
        <p className="border-b px-3 py-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          {translate('systemLogs.request')}
        </p>
        <dl className="grid gap-x-6 gap-y-2 p-3 text-xs sm:grid-cols-2">
          <DetailItem
            label={translate('systemLogs.methodStatus')}
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
          <DetailItem label={translate('systemLogs.route')} value={systemLog.route} mono className="sm:col-span-2" />
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
        <JsonBlock title={translate('systemLogs.metadata')} value={systemLog.metadata} />
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
          {translate('systemLogs.metadataEmpty')}
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
