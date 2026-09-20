'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { FormDialog } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n';
import type { UserRecord } from '@/lib/models';

export function UserCreateDialog({
  isSubmitting,
  onCreate,
}: {
  isSubmitting: boolean;
  onCreate: (values: {
    username: string;
    password: string;
    role: string;
    description: string;
  }) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { translate } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [description, setDescription] = useState('');

  async function submitUser(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!username.trim() || password.length < 6) {
      toast.error(translate('users.form.invalid'));
      return;
    }
    await onCreate({
      username: username.trim(),
      password,
      role,
      description: description.trim(),
    });
    setUsername('');
    setPassword('');
    setRole('admin');
    setDescription('');
    setIsOpen(false);
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus />
        {translate('users.form.create')}
      </Button>
      <FormDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={translate('users.form.createTitle')}
        description={translate('users.form.createDescription')}
        submitLabel={translate('common.create')}
        isSubmitting={isSubmitting}
        onSubmit={submitUser}
      >
        <div className="space-y-2">
          <Label htmlFor="new-username">{translate('common.username')}</Label>
          <Input
            id="new-username"
            value={username}
            maxLength={64}
            autoComplete="off"
            onChange={(changeEvent) => setUsername(changeEvent.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">
            {translate('users.form.initialPassword')}
          </Label>
          <Input
            id="new-password"
            type="password"
            value={password}
            minLength={6}
            maxLength={128}
            autoComplete="new-password"
            onChange={(changeEvent) => setPassword(changeEvent.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{translate('users.displayRole')}</Label>
          <Select value={role} onValueChange={(value) => setRole(String(value))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">admin</SelectItem>
              <SelectItem value="operator">operator</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {translate('users.form.displayRoleHint')}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-user-description">
            {translate('common.description')}
          </Label>
          <Textarea
            id="new-user-description"
            value={description}
            maxLength={255}
            onChange={(changeEvent) =>
              setDescription(changeEvent.target.value)
            }
          />
        </div>
      </FormDialog>
    </>
  );
}

export function UserDescriptionDialog({
  user,
  isSubmitting,
  onClose,
  onSave,
}: {
  user: UserRecord | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (userId: number, description: string) => Promise<void>;
}) {
  const [description, setDescription] = useState(user?.description ?? '');
  const { translate } = useI18n();

  return (
    <FormDialog
      open={user !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={translate('users.form.editTitle')}
      description={translate('users.form.editDescription', {
        username: user?.username ?? '',
      })}
      isSubmitting={isSubmitting}
      onSubmit={async (formEvent) => {
        formEvent.preventDefault();
        if (user) {
          await onSave(user.id, description.trim());
          onClose();
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="user-description">{translate('common.description')}</Label>
        <Textarea
          id="user-description"
          value={description}
          maxLength={255}
          onChange={(changeEvent) => setDescription(changeEvent.target.value)}
        />
      </div>
    </FormDialog>
  );
}

export function UserPasswordDialog({
  user,
  isSubmitting,
  onClose,
  onSave,
}: {
  user: UserRecord | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (userId: number, password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const { translate } = useI18n();

  return (
    <FormDialog
      open={user !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={translate('users.form.passwordTitle')}
      description={translate('users.form.passwordDescription', {
        username: user?.username ?? '',
      })}
      submitLabel={translate('account.changePassword')}
      isSubmitting={isSubmitting}
      onSubmit={async (formEvent) => {
        formEvent.preventDefault();
        if (!user || password.length < 6) {
          toast.error(translate('account.passwordTooShort'));
          return;
        }
        await onSave(user.id, password);
        onClose();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="updated-password">{translate('account.newPassword')}</Label>
        <Input
          id="updated-password"
          type="password"
          value={password}
          minLength={6}
          maxLength={128}
          autoComplete="new-password"
          onChange={(changeEvent) => setPassword(changeEvent.target.value)}
        />
      </div>
    </FormDialog>
  );
}
