'use client';

import type { FormEventHandler, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { combineClassNames } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  isSubmitting,
  submitDisabled = false,
  onSubmit,
  children,
  contentClassName,
  fillHeight = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  submitLabel?: string;
  isSubmitting: boolean;
  // 没有有效改动时别让人重复提交
  submitDisabled?: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  contentClassName?: string;
  // 内容区自己滚,页脚的保存/取消始终看得见;给值很长的表单用
  fillHeight?: boolean;
}) {
  const { translate } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={combineClassNames(
          fillHeight && 'flex max-h-[calc(100vh-2rem)] flex-col',
          contentClassName,
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className={combineClassNames(
            'space-y-4',
            fillHeight && 'flex min-h-0 flex-1 flex-col space-y-0 gap-4',
          )}
          onSubmit={onSubmit}
        >
          <div
            className={combineClassNames(
              'space-y-4',
              fillHeight && 'min-h-0 flex-1 overflow-y-auto',
            )}
          >
            {children}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              {translate('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || submitDisabled}>
              {isSubmitting
                ? translate('common.submitting')
                : (submitLabel ?? translate('common.save'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
