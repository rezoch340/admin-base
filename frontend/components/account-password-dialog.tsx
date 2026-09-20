'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDialog } from '@/components/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRequestErrorMessage, requestApi } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';

export function AccountPasswordDialog({
  open,
  userId,
  onClose,
}: {
  open: boolean;
  userId: number | undefined;
  onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const { translate } = useI18n();
  const passwordMutation = useMutation({
    mutationFn: (values: { userId: number; password: string }) =>
      requestApi(`/users/${values.userId}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: values.password }),
      }),
    onSuccess: () => {
      toast.success(translate('account.passwordChanged'));
      closeDialog();
    },
    onError: (error) =>
      toast.error(
        getRequestErrorMessage(
          error,
          translate('account.changePasswordFailed'),
        ),
      ),
  });

  function closeDialog() {
    setPassword('');
    onClose();
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeDialog();
        }
      }}
      title={translate('account.changeMyPassword')}
      description={translate('account.changePasswordDescription')}
      submitLabel={translate('account.changePassword')}
      isSubmitting={passwordMutation.isPending}
      onSubmit={(formEvent) => {
        formEvent.preventDefault();
        if (!userId || password.length < 6) {
          toast.error(translate('account.passwordTooShort'));
          return;
        }
        passwordMutation.mutate({ userId, password });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="account-password">
          {translate('account.newPassword')}
        </Label>
        <Input
          id="account-password"
          type="password"
          minLength={6}
          maxLength={128}
          value={password}
          autoComplete="new-password"
          onChange={(changeEvent) => setPassword(changeEvent.target.value)}
        />
      </div>
    </FormDialog>
  );
}
