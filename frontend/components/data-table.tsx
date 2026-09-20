import type { ReactNode } from 'react';
import { TableLoadingState, EmptyTableState } from '@/components/query-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { combineClassNames } from '@/lib/utils';

export interface DataTableColumn<RowType> {
  key: string;
  header: string;
  render: (row: RowType) => ReactNode;
  className?: string;
}

export function DataTable<RowType>({
  columns,
  rows,
  isLoading = false,
  emptyMessage,
  rowKey,
  footer,
  tableClassName,
  transitionKey,
  bodyMaxHeight,
}: {
  columns: Array<DataTableColumn<RowType>>;
  rows: RowType[];
  isLoading?: boolean;
  emptyMessage?: string;
  rowKey: (row: RowType) => string | number;
  footer?: ReactNode;
  tableClassName?: string;
  // 变化即重挂表体、重放入场动画。只在真正切页/换筛选时变，
  // 15 秒的后台轮询拿到同一页不会触发，避免表格自己闪
  transitionKey?: string | number;
  // 长列表让表体自己滚,表头钉住、页脚分页一直可见
  bodyMaxHeight?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table
        className={tableClassName}
        containerClassName={bodyMaxHeight ? combineClassNames('overflow-auto', bodyMaxHeight) : undefined}
      >
        <TableHeader className={bodyMaxHeight ? 'sticky top-0 z-10 bg-card' : undefined}>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={combineClassNames(
                  'whitespace-nowrap text-xs font-semibold text-muted-foreground',
                  bodyMaxHeight && 'bg-muted/40 backdrop-blur',
                  column.className,
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody
          key={transitionKey}
          // 只淡入不位移:tbody 横向平移会把表格撑出 overflow-x-auto 容器,动画期间闪出横向滚动条
          className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 motion-safe:ease-out"
        >
          {isLoading ? (
            <TableLoadingState columns={columns.length} />
          ) : rows.length === 0 ? (
            <EmptyTableState columns={columns.length} message={emptyMessage} />
          ) : (
            rows.map((row) => (
              <TableRow key={rowKey(row)} className="even:bg-muted/[0.14]">
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {footer ? (
        <div className="border-t bg-card px-4 py-3">{footer}</div>
      ) : null}
    </div>
  );
}
