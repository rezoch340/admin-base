'use client';

import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LOCALES, useI18n } from '@/lib/i18n';

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, translate } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={className}
            aria-label={translate('locale.switch')}
          >
            <Languages />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {LOCALES.map((localeOption) => (
          <DropdownMenuItem
            key={localeOption}
            disabled={localeOption === locale}
            onClick={() => setLocale(localeOption)}
          >
            {translate(`locale.${localeOption}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
