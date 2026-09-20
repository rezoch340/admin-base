'use client';

import { Badge } from '@/components/ui/badge';
import { useI18n, type MessageKey } from '@/lib/i18n';

const STATUS_LABEL_KEYS: Record<string, MessageKey> = {
  failed: 'common.failed',
  succeeded: 'common.succeeded',
};

export function StatusBadge({ status }: { status: string }) {
  const { translate } = useI18n();
  const labelKey = STATUS_LABEL_KEYS[status];
  return (
    <Badge variant={status === 'failed' ? 'destructive' : 'default'}>
      {labelKey ? translate(labelKey) : status}
    </Badge>
  );
}
