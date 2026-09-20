'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  KeyRound,
  Pencil,
  Power,
  PowerOff,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { FilterBar, type FilterFieldDefinition } from '@/components/filter-bar';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { PermissionBoundary } from '@/components/permission-boundary';
import { QueryErrorState } from '@/components/query-state';
import { RowActions } from '@/components/row-actions';
import { Badge } from '@/components/ui/badge';
import {
  getRequestErrorMessage,
  requestApi,
} from '@/lib/api-client';
import { useAuthentication } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { useI18n, type Translate } from '@/lib/i18n';
import type {
  PermissionGroup,
  UserRecord,
} from '@/lib/models';
import { useServerTable } from '@/lib/use-server-table';
import {
  UserCreateDialog,
  UserDescriptionDialog,
  UserPasswordDialog,
} from './user-form-dialogs';
import { UserRoleDialog } from './user-role-dialog';

interface UserConfirmation {
  type: 'toggle' | 'delete';
  user: UserRecord;
}

interface UserFilters {
  username: string;
  role: string;
  enabled: string;
}

const EMPTY_FILTERS: UserFilters = {
  username: '',
  role: '',
  enabled: '',
};

function filterFields(
  translate: Translate,
): Array<FilterFieldDefinition<keyof UserFilters>> {
  return [
    {
      key: 'username',
      label: translate('users.account'),
      placeholder: translate('common.username'),
    },
    {
      key: 'role',
      label: translate('users.displayRole'),
      placeholder: translate('users.rolePlaceholder'),
    },
    {
      key: 'enabled',
      label: translate('common.status'),
      type: 'select',
      placeholder: translate('users.allStatuses'),
      options: [
        { value: 'enabled', label: translate('common.enabled') },
        { value: 'disabled', label: translate('common.disabled') },
      ],
    },
  ];
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [descriptionUser, setDescriptionUser] = useState<UserRecord | null>(
    null,
  );
  const [passwordUser, setPasswordUser] = useState<UserRecord | null>(null);
  const [roleUser, setRoleUser] = useState<UserRecord | null>(null);
  const [confirmation, setConfirmation] = useState<UserConfirmation | null>(
    null,
  );
  const table = useServerTable<UserRecord, UserFilters>({
    resourceKey: 'users',
    endpoint: '/users',
    emptyFilters: EMPTY_FILTERS,
  });
  const { user: authenticatedUser, can, isRoot } = useAuthentication();
  const { translate, locale } = useI18n();

  const permissionGroupsQuery = useQuery({
    queryKey: ['permission-groups'],
    // 选择器要能选到全部权限组,用不分页的 options 源
    queryFn: () => requestApi<PermissionGroup[]>('/rbac/roles/options'),
    enabled: can('read', 'rbac'),
  });

  const createMutation = useMutation({
    mutationFn: (values: {
      username: string;
      password: string;
      role: string;
      description: string;
    }) =>
      requestApi<UserRecord>('/users', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      toast.success(translate('users.created'));
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) =>
      toast.error(
        getRequestErrorMessage(error, translate('users.createFailed')),
      ),
  });

  const userMutation = useMutation({
    mutationFn: async ({
      userId,
      path,
      method,
      body,
    }: {
      userId: number;
      path: string;
      method: 'PATCH' | 'POST' | 'DELETE';
      body?: unknown;
    }) =>
      requestApi(`/users/${userId}${path}`, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    onSuccess: async () => {
      toast.success(translate('users.updated'));
      setConfirmation(null);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) =>
      toast.error(
        getRequestErrorMessage(error, translate('users.operationFailed')),
      ),
  });

  const roleMutation = useMutation({
    mutationFn: async ({
      userId,
      currentRoleIds,
      selectedRoleIds,
    }: {
      userId: number;
      currentRoleIds: number[];
      selectedRoleIds: number[];
    }) => {
      const rolesToAssign = selectedRoleIds.filter(
        (roleId) => !currentRoleIds.includes(roleId),
      );
      const rolesToRemove = currentRoleIds.filter(
        (roleId) => !selectedRoleIds.includes(roleId),
      );
      await Promise.all([
        ...rolesToAssign.map((roleId) =>
          requestApi(`/rbac/users/${userId}/roles/${roleId}`, {
            method: 'POST',
          }),
        ),
        ...rolesToRemove.map((roleId) =>
          requestApi(`/rbac/users/${userId}/roles/${roleId}`, {
            method: 'DELETE',
          }),
        ),
      ]);
    },
    onSuccess: async (unusedResponse, values) => {
      void unusedResponse;
      toast.success(translate('users.groupsUpdated'));
      await queryClient.invalidateQueries({
        queryKey: ['user-roles', values.userId],
      });
    },
    onError: (error) =>
      toast.error(
        getRequestErrorMessage(error, translate('users.groupsUpdateFailed')),
      ),
  });

  function canMutateUser(userRecord: UserRecord): boolean {
    return (
      can('update', 'user') &&
      (!userRecord.isRoot || userRecord.id === authenticatedUser?.id)
    );
  }

  const columns: Array<DataTableColumn<UserRecord>> = [
    {
      key: 'username',
      header: translate('users.account'),
      render: (userRecord) => (
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{userRecord.username}</p>
            {userRecord.isRoot ? <Badge>Root</Badge> : null}
          </div>
          <p className="mt-0.5 max-w-64 text-xs text-muted-foreground">
            {userRecord.description || translate('common.noDescription')}
          </p>
        </div>
      ),
    },
    {
      key: 'role',
      header: translate('users.displayRole'),
      render: (userRecord) => (
        <span className="font-mono text-xs">{userRecord.role}</span>
      ),
    },
    {
      key: 'enabled',
      header: translate('common.status'),
      render: (userRecord) => (
        <Badge variant={userRecord.enabled ? 'default' : 'secondary'}>
          {userRecord.enabled
            ? translate('common.enabled')
            : translate('common.disabled')}
        </Badge>
      ),
    },
    {
      key: 'last-login',
      header: translate('users.lastLogin'),
      render: (userRecord) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDateTime(userRecord.lastLoginAt, locale)}
        </span>
      ),
    },
    {
      key: 'created',
      header: translate('users.createdAt'),
      render: (userRecord) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDateTime(userRecord.createdAt, locale)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: translate('common.actions'),
      render: (userRecord) => {
        const accountCanBeMutated = canMutateUser(userRecord);
        return (
          <RowActions
            label={translate('users.rowActions', {
              username: userRecord.username,
            })}
            actions={[
              {
                label: translate('users.editProfile'),
                icon: <Pencil />,
                disabled: !accountCanBeMutated,
                onSelect: () => setDescriptionUser(userRecord),
              },
              {
                label: translate('users.changePassword'),
                icon: <KeyRound />,
                disabled: !accountCanBeMutated,
                onSelect: () => setPasswordUser(userRecord),
              },
              {
                label: translate('users.configureGroups'),
                icon: <ShieldCheck />,
                disabled: !isRoot || !accountCanBeMutated,
                onSelect: () => setRoleUser(userRecord),
              },
              {
                label: userRecord.enabled
                  ? translate('users.disable')
                  : translate('users.enable'),
                icon: userRecord.enabled ? <PowerOff /> : <Power />,
                disabled: !accountCanBeMutated,
                separatorBefore: true,
                onSelect: () =>
                  setConfirmation({ type: 'toggle', user: userRecord }),
              },
              {
                label: translate('users.delete'),
                icon: <Trash2 />,
                disabled:
                  !can('delete', 'user') ||
                  (userRecord.isRoot &&
                    userRecord.id !== authenticatedUser?.id),
                destructive: true,
                onSelect: () =>
                  setConfirmation({ type: 'delete', user: userRecord }),
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <PermissionBoundary action="read" subject="user">
      <PageHeader
        eyebrow="Administrators"
        title={translate('nav.users')}
        description={translate('users.description')}
        actions={
          can('create', 'user') ? (
            <UserCreateDialog
              isSubmitting={createMutation.isPending}
              onCreate={async (values) => {
                await createMutation.mutateAsync(values);
              }}
            />
          ) : undefined
        }
      />
      {table.isError ? (
        <QueryErrorState onRetry={() => table.filterBarProps.onSubmit()} />
      ) : null}
      <FilterBar
        fields={filterFields(translate)}
        {...table.filterBarProps}
      />
      <DataTable
        columns={columns}
        {...table.tableProps}
        emptyMessage={translate('users.empty')}
        rowKey={(userRecord) => userRecord.id}
        footer={
          <Pagination {...table.paginationProps} />
        }
      />

      <UserDescriptionDialog
        key={`description-user-${descriptionUser?.id ?? 'closed'}`}
        user={descriptionUser}
        isSubmitting={userMutation.isPending}
        onClose={() => setDescriptionUser(null)}
        onSave={async (userId, description) => {
          await userMutation.mutateAsync({
            userId,
            path: '',
            method: 'PATCH',
            body: { description },
          });
        }}
      />
      <UserPasswordDialog
        key={`password-user-${passwordUser?.id ?? 'closed'}`}
        user={passwordUser}
        isSubmitting={userMutation.isPending}
        onClose={() => setPasswordUser(null)}
        onSave={async (userId, password) => {
          await userMutation.mutateAsync({
            userId,
            path: '/password',
            method: 'PATCH',
            body: { password },
          });
        }}
      />
      <UserRoleDialog
        key={`role-user-${roleUser?.id ?? 'closed'}`}
        user={roleUser}
        permissionGroups={permissionGroupsQuery.data ?? []}
        isSubmitting={roleMutation.isPending}
        onClose={() => setRoleUser(null)}
        onSave={async (userId, currentRoleIds, selectedRoleIds) => {
          await roleMutation.mutateAsync({
            userId,
            currentRoleIds,
            selectedRoleIds,
          });
        }}
      />
      <ConfirmDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmation(null);
          }
        }}
        title={
          confirmation?.type === 'delete'
            ? translate('users.deleteTitle')
            : confirmation?.user.enabled
              ? translate('users.disableTitle')
              : translate('users.enableTitle')
        }
        description={
          confirmation?.type === 'delete'
            ? translate('users.deleteDescription', {
                username: confirmation.user.username,
              })
            : translate('users.toggleDescription', {
                username: confirmation?.user.username ?? '',
              })
        }
        confirmLabel={
          confirmation?.type === 'delete'
            ? translate('common.delete')
            : translate('common.confirm')
        }
        isPending={userMutation.isPending}
        onConfirm={() => {
          if (!confirmation) {
            return;
          }
          userMutation.mutate({
            userId: confirmation.user.id,
            path: confirmation.type === 'delete' ? '' : '/enabled',
            method: confirmation.type === 'delete' ? 'DELETE' : 'POST',
            body:
              confirmation.type === 'toggle'
                ? { enabled: !confirmation.user.enabled }
                : undefined,
          });
        }}
      />
    </PermissionBoundary>
  );
}
