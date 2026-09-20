'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { FormDialog } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n';

export function PermissionCreateDialog({
  isSubmitting,
  onCreate,
}: {
  isSubmitting: boolean;
  onCreate: (values: {
    action: string;
    subject: string;
    description: string;
  }) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { translate } = useI18n();
  const [action, setAction] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Plus />
        {translate('permissions.new')}
      </Button>
      <FormDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={translate('permissions.new')}
        description={translate('permissions.dialogDescription')}
        submitLabel={translate('common.create')}
        isSubmitting={isSubmitting}
        onSubmit={async (formEvent) => {
          formEvent.preventDefault();
          if (!action.trim() || !subject.trim()) {
            toast.error(translate('permissions.required'));
            return;
          }
          await onCreate({
            action: action.trim(),
            subject: subject.trim(),
            description: description.trim(),
          });
          setAction('');
          setSubject('');
          setDescription('');
          setIsOpen(false);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="permission-action">Action</Label>
            <Input
              id="permission-action"
              value={action}
              maxLength={64}
              placeholder="read"
              onChange={(changeEvent) => setAction(changeEvent.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="permission-subject">Subject</Label>
            <Input
              id="permission-subject"
              value={subject}
              maxLength={64}
              placeholder="user"
              onChange={(changeEvent) => setSubject(changeEvent.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="permission-description">
            {translate('common.description')}
          </Label>
          <Textarea
            id="permission-description"
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
