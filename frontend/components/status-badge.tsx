import { Badge } from '@/components/ui/badge';

const STATUS_LABELS: Record<string, string> = {
  failed: '失败',
  succeeded: '成功',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === 'failed' ? 'destructive' : 'default'}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
