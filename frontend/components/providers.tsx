'use client';

import { useState, type ReactNode } from 'react';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { AuthenticationProvider } from '@/lib/auth';
import { I18nProvider, type Locale } from '@/lib/i18n';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            refetchOnMount: 'always',
            refetchOnReconnect: 'always',
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );

  return (
    <I18nProvider initialLocale={initialLocale}>
      <QueryClientProvider client={queryClient}>
        <AuthenticationProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </AuthenticationProvider>
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </I18nProvider>
  );
}
