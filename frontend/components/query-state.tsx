'use client';

import { AlertCircle, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n';

export function TableLoadingState({ columns }: { columns: number }) {
  const rowIndexes = Array.from(Array(5).keys());
  const columnIndexes = Array.from(Array(columns).keys());
  return rowIndexes.map((rowIndex) => (
    <tr key={`loading-row-${rowIndex}`} className="border-b last:border-0">
      {columnIndexes.map((columnIndex) => (
        <td key={`loading-cell-${columnIndex}`} className="p-4">
          <Skeleton className="h-4 w-full max-w-36" />
        </td>
      ))}
    </tr>
  ));
}

export function EmptyTableState({
  columns,
  message,
}: {
  columns: number;
  message?: string;
}) {
  const { translate } = useI18n();
  return (
    <tr>
      <td colSpan={columns} className="h-36 text-center">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Inbox className="size-4" />
          {message ?? translate('common.noData')}
        </span>
      </td>
    </tr>
  );
}

export function QueryErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const { translate } = useI18n();
  return (
    <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
      <AlertCircle className="size-4 shrink-0" />
      <span className="flex-1">{message ?? translate('common.loadFailed')}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-destructive/30 px-2 py-1 text-xs hover:bg-destructive/10"
        >
          {translate('common.retry')}
        </button>
      )}
    </div>
  );
}
