'use client';

import { Fragment, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n';

export interface RowAction {
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  separatorBefore?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export function RowActions({
  actions,
  label,
}: {
  actions: RowAction[];
  label?: string;
}) {
  const { translate } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={label ?? translate('common.openActionsMenu')}>
            <MoreHorizontal />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {actions.map((action, actionIndex) => (
          <Fragment key={action.label}>
            {action.separatorBefore && actionIndex > 0 ? (
              <DropdownMenuSeparator />
            ) : null}
            <DropdownMenuItem
              variant={action.destructive ? 'destructive' : 'default'}
              disabled={action.disabled}
              onClick={action.onSelect}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
