'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { FilterBar, type FilterFieldDefinition } from '@/components/filter-bar';
import { PageHeader } from '@/components/page-header';
import { RowActions } from '@/components/row-actions';
import { Pagination } from '@/components/pagination';
import { PermissionBoundary } from '@/components/permission-boundary';
import { QueryErrorState } from '@/components/query-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRequestErrorMessage, requestApi } from '@/lib/api-client';
import { useAuthentication } from '@/lib/auth';
import { useI18n, type Translate } from '@/lib/i18n';
import type { CatalogPermission, PermissionGroup } from '@/lib/models';
import { useServerTable } from '@/lib/use-server-table';
import { PermissionCreateDialog } from './permission-create-dialog';
import {
  PermissionGroupDialog,
  type PermissionGroupFormValues,
} from './permission-group-dialog';

interface PermissionGroupFilters {
  name: string;
  permission: string;
}

interface PermissionFilters {
  action: string;
  subject: string;
}

const EMPTY_GROUP_FILTERS: PermissionGroupFilters = {
  name: '',
  permission: '',
};

const EMPTY_PERMISSION_FILTERS: PermissionFilters = {
  action: '',
  subject: '',
};

function groupFilterFields(
  translate: Translate,
): Array<FilterFieldDefinition<keyof PermissionGroupFilters>> {
  return [
    {
      key: 'name',
      label: translate('nav.permissionGroups'),
      placeholder: translate('permissionGroups.namePlaceholder'),
    },
    {
      key: 'permission',
      label: translate('permissionGroups.containsPermission'),
      placeholder: 'action/subject',
    },
  ];
}

function permissionFilterFields(
  translate: Translate,
): Array<FilterFieldDefinition<keyof PermissionFilters>> {
  return [
    {
      key: 'action',
      label: translate('permissions.action'),
      placeholder: translate('permissions.actionPlaceholder'),
    },
    {
      key: 'subject',
      label: translate('permissions.subject'),
      placeholder: translate('permissions.subjectPlaceholder'),
    },
  ];
}

export default function PermissionGroupsPage() {
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(
    null,
  );
  const [deletingGroup, setDeletingGroup] = useState<PermissionGroup | null>(
    null,
  );
  const [deletingPermission, setDeletingPermission] =
    useState<CatalogPermission | null>(null);
  const { isRoot } = useAuthentication();
  const { translate } = useI18n();
  const queryClient = useQueryClient();
  const groupTable = useServerTable<PermissionGroup, PermissionGroupFilters>({
    resourceKey: 'permission-groups',
    endpoint: '/rbac/roles',
    emptyFilters: EMPTY_GROUP_FILTERS,
  });
  const permissionTable = useServerTable<CatalogPermission, PermissionFilters>({
    resourceKey: 'permissions',
    endpoint: '/rbac/permissions',
    emptyFilters: EMPTY_PERMISSION_FILTERS,
  });

  // 编辑弹窗要列出整个权限目录供勾选,分页会截断,改用不分页的 options 源
  const permissionOptionsQuery = useQuery({
    queryKey: ['permissions', 'options'],
    queryFn: () => requestApi<CatalogPermission[]>('/rbac/permissions/options'),
  });

  const saveGroupMutation = useMutation({
    mutationFn: async ({
      permissionGroup,
      values,
    }: {
      permissionGroup: PermissionGroup | null;
      values: PermissionGroupFormValues;
    }) => {
      const savedGroup = permissionGroup
        ? await requestApi<PermissionGroup>(
            `/rbac/roles/${permissionGroup.id}`,
            {
              method: 'PATCH',
              body: JSON.stringify({
                name: values.name,
                description: values.description,
              }),
            },
          )
        : await requestApi<PermissionGroup>('/rbac/roles', {
            method: 'POST',
            body: JSON.stringify({
              name: values.name,
              description: values.description,
            }),
          });
      const currentPermissionIds =
        permissionGroup?.permissions.map((permission) => permission.id) ?? [];
      const permissionsToAttach = values.permissionIds.filter(
        (permissionId) => !currentPermissionIds.includes(permissionId),
      );
      const permissionsToDetach = currentPermissionIds.filter(
        (permissionId) => !values.permissionIds.includes(permissionId),
      );
      await Promise.all([
        ...permissionsToAttach.map((permissionId) =>
          requestApi(
            `/rbac/roles/${savedGroup.id}/permissions/${permissionId}`,
            { method: 'POST' },
          ),
        ),
        ...permissionsToDetach.map((permissionId) =>
          requestApi(
            `/rbac/roles/${savedGroup.id}/permissions/${permissionId}`,
            { method: 'DELETE' },
          ),
        ),
      ]);
    },
    onSuccess: async () => {
      toast.success(translate('permissionGroups.saved'));
      await queryClient.invalidateQueries({
        queryKey: ['permission-groups'],
      });
    },
    onError: (error) =>
      toast.error(
        getRequestErrorMessage(error, translate('permissionGroups.saveFailed')),
      ),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (permissionGroupId: number) =>
      requestApi(`/rbac/roles/${permissionGroupId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      toast.success(translate('permissionGroups.deleted'));
      setDeletingGroup(null);
      await queryClient.invalidateQueries({
        queryKey: ['permission-groups'],
      });
    },
    onError: (error) =>
      toast.error(
        getRequestErrorMessage(
          error,
          translate('permissionGroups.deleteFailed'),
        ),
      ),
  });

  const createPermissionMutation = useMutation({
    mutationFn: (values: {
      action: string;
      subject: string;
      description: string;
    }) =>
      requestApi<CatalogPermission>('/rbac/permissions', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      toast.success(translate('permissions.created'));
      await queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
    onError: (error) =>
      toast.error(
        getRequestErrorMessage(error, translate('permissions.createFailed')),
      ),
  });

  const deletePermissionMutation = useMutation({
    mutationFn: (permissionId: number) =>
      requestApi(`/rbac/permissions/${permissionId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      toast.success(translate('permissions.deleted'));
      setDeletingPermission(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['permissions'] }),
        queryClient.invalidateQueries({ queryKey: ['permission-groups'] }),
      ]);
    },
    onError: (error) =>
      toast.error(
        getRequestErrorMessage(error, translate('permissions.deleteFailed')),
      ),
  });


  const groupColumns: Array<DataTableColumn<PermissionGroup>> = [
    {
      key: 'name',
      header: translate('nav.permissionGroups'),
      render: (permissionGroup) => (
        <div>
          <p className="font-medium">{permissionGroup.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {permissionGroup.description || translate('common.noDescription')}
          </p>
        </div>
      ),
    },
    {
      key: 'permissions',
      header: translate('permissions.permission'),
      render: (permissionGroup) => (
        <div className="flex max-w-3xl flex-wrap gap-1">
          {permissionGroup.permissions.map((permission) => (
            <Badge key={permission.id} variant="secondary">
              {permission.action}/{permission.subject}
            </Badge>
          ))}
          {permissionGroup.permissions.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              {translate('common.notConfigured')}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: translate('common.actions'),
      className: 'w-24',
      render: (permissionGroup) =>
        isRoot ? (
          <RowActions
            label={translate('permissionGroups.rowActions', {
              name: permissionGroup.name,
            })}
            actions={[
              {
                label: translate('permissionGroups.edit'),
                icon: <Pencil />,
                onSelect: () => setEditingGroup(permissionGroup),
              },
              {
                label: translate('permissionGroups.delete'),
                icon: <Trash2 />,
                destructive: true,
                separatorBefore: true,
                onSelect: () => setDeletingGroup(permissionGroup),
              },
            ]}
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {translate('common.rootOnly')}
          </span>
        ),
    },
  ];

  const permissionColumns: Array<DataTableColumn<CatalogPermission>> = [
    {
      key: 'tuple',
      header: translate('permissions.permission'),
      render: (permission) => (
        <code className="font-mono text-xs">
          {permission.action}/{permission.subject}
        </code>
      ),
    },
    {
      key: 'description',
      header: translate('common.description'),
      render: (permission) => permission.description || '—',
    },
    {
      key: 'actions',
      header: translate('common.actions'),
      className: 'w-24',
      render: (permission) =>
        isRoot ? (
          <RowActions
            label={translate('permissions.rowActions', {
              permission: `${permission.action}/${permission.subject}`,
            })}
            actions={[
              {
                label: translate('permissions.delete'),
                icon: <Trash2 />,
                destructive: true,
                onSelect: () => setDeletingPermission(permission),
              },
            ]}
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {translate('common.rootOnly')}
          </span>
        ),
    },
  ];

  return (
    <PermissionBoundary action="read" subject="rbac">
      <PageHeader
        eyebrow="RBAC"
        title={translate('nav.permissionGroups')}
        description={translate('permissionGroups.description')}
        actions={
          isRoot ? (
            <div className="flex gap-2">
              <PermissionCreateDialog
                isSubmitting={createPermissionMutation.isPending}
                onCreate={async (values) => {
                  await createPermissionMutation.mutateAsync(values);
                }}
              />
              <Button onClick={() => setIsCreatingGroup(true)}>
                <Plus />
                {translate('permissionGroups.new')}
              </Button>
            </div>
          ) : undefined
        }
      />
      {groupTable.isError || permissionTable.isError ? (
        <QueryErrorState
          onRetry={() => {
            groupTable.filterBarProps.onSubmit();
            permissionTable.filterBarProps.onSubmit();
          }}
        />
      ) : null}
      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">
          {translate('permissionGroups.listTitle')}
        </h2>
        <FilterBar
          fields={groupFilterFields(translate)}
          {...groupTable.filterBarProps}
        />
        <DataTable
          columns={groupColumns}
          {...groupTable.tableProps}
          emptyMessage={translate('permissionGroups.empty')}
          rowKey={(permissionGroup) => permissionGroup.id}
          footer={
            <Pagination {...groupTable.paginationProps} />
          }
        />
      </section>
      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">
            {translate('permissions.catalogTitle')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {translate('permissions.catalogDescription')}
          </p>
        </div>
        <FilterBar
          fields={permissionFilterFields(translate)}
          {...permissionTable.filterBarProps}
        />
        <DataTable
          columns={permissionColumns}
          {...permissionTable.tableProps}
          emptyMessage={translate('permissions.empty')}
          rowKey={(permission) => permission.id}
          footer={
            <Pagination {...permissionTable.paginationProps} />
          }
        />
      </section>

      <PermissionGroupDialog
        key={
          editingGroup
            ? `editing-permission-group-${editingGroup.id}`
            : `new-permission-group-${isCreatingGroup}`
        }
        open={isCreatingGroup || editingGroup !== null}
        permissionGroup={editingGroup}
        permissions={permissionOptionsQuery.data ?? []}
        isSubmitting={saveGroupMutation.isPending}
        onClose={() => {
          setIsCreatingGroup(false);
          setEditingGroup(null);
        }}
        onSave={async (values) => {
          await saveGroupMutation.mutateAsync({
            permissionGroup: editingGroup,
            values,
          });
        }}
      />
      <ConfirmDialog
        open={deletingGroup !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingGroup(null);
          }
        }}
        title={translate('permissionGroups.delete')}
        description={translate('permissionGroups.deleteConfirmDescription', {
          name: deletingGroup?.name ?? '',
        })}
        confirmLabel={translate('common.delete')}
        isPending={deleteGroupMutation.isPending}
        onConfirm={() => {
          if (deletingGroup) {
            deleteGroupMutation.mutate(deletingGroup.id);
          }
        }}
      />
      <ConfirmDialog
        open={deletingPermission !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingPermission(null);
          }
        }}
        title={translate('permissions.delete')}
        description={translate('permissions.deleteConfirmDescription', {
          permission: `${deletingPermission?.action ?? ''}/${deletingPermission?.subject ?? ''}`,
        })}
        confirmLabel={translate('common.delete')}
        isPending={deletePermissionMutation.isPending}
        onConfirm={() => {
          if (deletingPermission) {
            deletePermissionMutation.mutate(deletingPermission.id);
          }
        }}
      />
    </PermissionBoundary>
  );
}
