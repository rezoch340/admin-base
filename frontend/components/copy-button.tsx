'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { copyTextToClipboard } from '@/lib/clipboard';
import { useI18n } from '@/lib/i18n';

export function CopyButton({
  value,
  label,
  successMessage,
  errorMessage,
  className,
}: {
  value: string;
  label: string;
  successMessage?: string;
  errorMessage?: string;
  className?: string;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const { translate } = useI18n();

  async function copyValue() {
    try {
      await copyTextToClipboard(value);
      setIsCopied(true);
      toast.success(successMessage ?? translate('common.copied'));
      window.setTimeout(() => setIsCopied(false), 1500);
    } catch {
      toast.error(errorMessage ?? translate('common.copyFailed'));
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className={className}
      aria-label={label}
      onClick={() => void copyValue()}
    >
      {isCopied ? <Check /> : <Copy />}
    </Button>
  );
}
