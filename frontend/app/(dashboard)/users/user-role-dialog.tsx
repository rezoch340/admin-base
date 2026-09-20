'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDialog } from '@/components/form-dialog';
import { QueryErrorState } from '@/components/query-state';
import { requestApi } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import type { PermissionGroup, UserRecord } from '@/lib/models';

export function UserRoleDialog({
  user,
  permissionGroups,
  isSubmitting,
  onClose,
  onSave,
}: {
  user: UserRecord | null;
  permissionGroups: PermissionGroup[];
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (
    userId: number,
    currentRoleIds: number[],
    selectedRoleIds: number[],
  ) => Promise<void>;
}) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[] | null>(null);
  const { translate } = useI18n();
  const currentRolesQuery = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: () =>
      requestApi<PermissionGroup[]>(`/rbac/users/${user?.id}/roles`),
    enabled: user !== null,
  });

  const effectiveSelectedRoleIds =
    selectedRoleIds ??
    currentRolesQuery.data?.map((permissionGroup) => permissionGroup.id) ??
    [];

  function toggleRole(roleId: number) {
    setSelectedRoleIds(
      effectiveSelectedRoleIds.includes(roleId)
        ? effectiveSelectedRoleIds.filter(
            (currentRoleId) => currentRoleId !== roleId,
          )
        : [...effectiveSelectedRoleIds, roleId],
    );
  }

  return (
    <FormDialog
      open={user !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={translate('users.configureGroups')}
      description={translate('users.roles.description', {
        username: user?.username ?? '',
      })}
      submitLabel={translate('users.roles.submit')}
      isSubmitting={isSubmitting}
      onSubmit={async (formEvent) => {
        formEvent.preventDefault();
        if (!user || !currentRolesQuery.data) {
          toast.error(translate('users.roles.notLoaded'));
          return;
        }
        await onSave(
          user.id,
          currentRolesQuery.data.map(
            (permissionGroup) => permissionGroup.id,
          ),
          effectiveSelectedRoleIds,
        );
        onClose();
      }}
    >
      {currentRolesQuery.isError ? (
        <QueryErrorState message={translate('users.roles.loadFailed')} />
      ) : null}
      <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border p-3">
        {permissionGroups.map((permissionGroup) => (
          <label
            key={permissionGroup.id}
            className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-muted"
          >
            <input
              type="checkbox"
              checked={effectiveSelectedRoleIds.includes(permissionGroup.id)}
              className="mt-0.5 size-4 accent-primary"
              onChange={() => toggleRole(permissionGroup.id)}
            />
            <span>
              <span className="block text-sm font-medium">
                {permissionGroup.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {permissionGroup.description || translate('common.noDescription')} ·{' '}
                {translate('users.roles.permissionCount', {
                  count: permissionGroup.permissions.length,
                })}
              </span>
            </span>
          </label>
        ))}
        {permissionGroups.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {translate('users.roles.empty')}
          </p>
        ) : null}
      </div>
    </FormDialog>
  );
}
