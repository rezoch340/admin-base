import type { OpenAPIObject } from '@nestjs/swagger';
import { arraySchemaReference, schemaReference } from './openapi.schemas';

type SchemaDefinition = NonNullable<
  NonNullable<OpenAPIObject['components']>['schemas']
>[string];

export const OPEN_API_SUCCESS_SCHEMAS: Record<string, SchemaDefinition> = {
  RbacController_createRole: schemaReference('PermissionGroup'),
  RbacController_listRoles: schemaReference('PermissionGroupPage'),
  RbacController_listRoleOptions: arraySchemaReference('PermissionGroup'),
  RbacController_updateRole: schemaReference('PermissionGroup'),
  RbacController_deleteRole: schemaReference('DeletedResult'),
  RbacController_createPermission: schemaReference('Permission'),
  RbacController_listPermissions: schemaReference('PermissionPage'),
  RbacController_listPermissionOptions: arraySchemaReference('Permission'),
  RbacController_deletePermission: schemaReference('DeletedResult'),
  RbacController_attachPermissionFromBody: schemaReference('AttachedResult'),
  RbacController_attachPermission: schemaReference('AttachedResult'),
  RbacController_detachPermission: schemaReference('DetachedResult'),
  RbacController_listUserRoles: arraySchemaReference('PermissionGroup'),
  RbacController_assignRoleFromBody: schemaReference('AssignedResult'),
  RbacController_assignRole: schemaReference('AssignedResult'),
  RbacController_unassignRole: schemaReference('UnassignedResult'),
  UsersController_list: schemaReference('UserPage'),
  UsersController_create: schemaReference('User'),
  UsersController_findOne: schemaReference('User'),
  UsersController_update: schemaReference('User'),
  UsersController_remove: schemaReference('DeletedResult'),
  UsersController_setPassword: schemaReference('User'),
  UsersController_setEnabled: schemaReference('UserEnabledResult'),
  AuthController_login: schemaReference('LoginResponse'),
  AuthController_me: schemaReference('AuthenticatedUser'),
  SystemLogsController_list: schemaReference('SystemLogPage'),
};

export const NOT_FOUND_OPERATION_IDS = new Set([
  'RbacController_updateRole',
  'RbacController_deleteRole',
  'RbacController_deletePermission',
  'RbacController_attachPermissionFromBody',
  'RbacController_attachPermission',
  'RbacController_detachPermission',
  'RbacController_listUserRoles',
  'RbacController_assignRoleFromBody',
  'RbacController_assignRole',
  'RbacController_unassignRole',
  'UsersController_findOne',
  'UsersController_update',
  'UsersController_remove',
  'UsersController_setPassword',
  'UsersController_setEnabled',
]);

export const CONFLICT_OPERATION_IDS = new Set([
  'RbacController_createRole',
  'RbacController_updateRole',
  'RbacController_createPermission',
  'RbacController_attachPermissionFromBody',
  'RbacController_attachPermission',
  'RbacController_assignRoleFromBody',
  'RbacController_assignRole',
  'UsersController_create',
]);
