import type { OpenAPIObject } from '@nestjs/swagger';

type SchemaDefinition = NonNullable<
  NonNullable<OpenAPIObject['components']>['schemas']
>[string];

// 分页信封:结构固定,只有 rows 的元素类型不同
function pageSchema(itemSchemaName: string): SchemaDefinition {
  return {
    type: 'object',
    required: ['rows', 'page', 'pageSize', 'total'],
    properties: {
      rows: {
        type: 'array',
        items: { $ref: `#/components/schemas/${itemSchemaName}` },
      },
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      total: { type: 'integer', minimum: 0 },
    },
  };
}

const dateTimeSchema = {
  type: 'string',
  format: 'date-time',
} satisfies SchemaDefinition;

const nullableDateTimeSchema = {
  ...dateTimeSchema,
  nullable: true,
} satisfies SchemaDefinition;

const nullableStringSchema = {
  type: 'string',
  nullable: true,
} satisfies SchemaDefinition;

const permissionProperties = {
  id: { type: 'integer', example: 1 },
  action: { type: 'string', example: 'read' },
  subject: { type: 'string', example: 'user' },
  description: nullableStringSchema,
} satisfies Record<string, SchemaDefinition>;

export const OPEN_API_RESPONSE_SCHEMAS = {
  ErrorResponse: {
    type: 'object',
    required: ['statusCode', 'message', 'timestamp'],
    properties: {
      statusCode: { type: 'integer', example: 400 },
      message: {
        oneOf: [
          { type: 'string', example: '请求参数非法' },
          {
            type: 'array',
            items: { type: 'string' },
            example: ['name must be a string'],
          },
          {
            type: 'object',
            additionalProperties: true,
            description:
              'Nest HttpException 的结构化响应，例如 statusCode/message/error。',
          },
        ],
      },
      timestamp: dateTimeSchema,
    },
  },
  DeletedResult: {
    type: 'object',
    required: ['deleted'],
    properties: { deleted: { type: 'boolean', enum: [true] } },
  },
  AttachedResult: {
    type: 'object',
    required: ['attached'],
    properties: { attached: { type: 'boolean', enum: [true] } },
  },
  DetachedResult: {
    type: 'object',
    required: ['detached'],
    properties: { detached: { type: 'boolean', enum: [true] } },
  },
  AssignedResult: {
    type: 'object',
    required: ['assigned'],
    properties: { assigned: { type: 'boolean', enum: [true] } },
  },
  UnassignedResult: {
    type: 'object',
    required: ['unassigned'],
    properties: { unassigned: { type: 'boolean', enum: [true] } },
  },
  Permission: {
    type: 'object',
    required: ['id', 'action', 'subject'],
    properties: {
      ...permissionProperties,
      deletedAt: nullableDateTimeSchema,
    },
  },
  PermissionTuple: {
    type: 'object',
    required: ['action', 'subject'],
    properties: {
      action: permissionProperties.action,
      subject: permissionProperties.subject,
    },
  },
  PermissionGroup: {
    type: 'object',
    required: ['id', 'name', 'createdAt', 'permissions'],
    properties: {
      id: { type: 'integer', example: 1 },
      name: { type: 'string', example: 'operator' },
      description: nullableStringSchema,
      createdAt: dateTimeSchema,
      permissions: {
        type: 'array',
        items: { $ref: '#/components/schemas/Permission' },
      },
    },
  },
  User: {
    type: 'object',
    required: ['id', 'username', 'role', 'isRoot', 'enabled', 'createdAt'],
    properties: {
      id: { type: 'integer', example: 1 },
      username: { type: 'string', example: 'admin' },
      role: { type: 'string', enum: ['admin', 'operator'] },
      isRoot: { type: 'boolean' },
      enabled: { type: 'boolean' },
      description: nullableStringSchema,
      lastLoginAt: nullableDateTimeSchema,
      createdAt: dateTimeSchema,
    },
  },
  UserEnabledResult: {
    type: 'object',
    required: ['id', 'username', 'enabled'],
    properties: {
      id: { type: 'integer' },
      username: { type: 'string' },
      enabled: { type: 'boolean' },
    },
  },
  AuthenticatedUser: {
    type: 'object',
    required: ['id', 'sub', 'username', 'permissions', 'isRoot'],
    properties: {
      id: { type: 'integer', example: 1 },
      sub: {
        oneOf: [{ type: 'integer' }, { type: 'string' }],
        description: 'JWT subject',
      },
      username: { type: 'string', example: 'admin' },
      permissions: {
        type: 'array',
        items: { $ref: '#/components/schemas/PermissionTuple' },
      },
      isRoot: { type: 'boolean' },
    },
  },
  LoginResponse: {
    type: 'object',
    required: ['token', 'user'],
    properties: {
      token: { type: 'string', description: '后台管理员 JWT' },
      user: {
        type: 'object',
        required: ['id', 'username', 'role'],
        properties: {
          id: { type: 'integer' },
          username: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'operator'] },
        },
      },
    },
  },
  SystemLog: {
    type: 'object',
    required: [
      'id',
      'name',
      'description',
      'actorUserId',
      'actorUsername',
      'action',
      'subject',
      'targetType',
      'metadata',
      'method',
      'route',
      'status',
      'statusCode',
      'createdAt',
    ],
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      description: { type: 'string' },
      actorUserId: { type: 'integer' },
      actorUsername: { type: 'string' },
      action: { type: 'string' },
      subject: { type: 'string' },
      targetType: { type: 'string' },
      targetId: nullableStringSchema,
      targetName: nullableStringSchema,
      metadata: { type: 'object', additionalProperties: true },
      method: { type: 'string' },
      route: { type: 'string' },
      status: { type: 'string', enum: ['succeeded', 'failed'] },
      statusCode: { type: 'integer' },
      errorMessage: nullableStringSchema,
      ipAddress: nullableStringSchema,
      userAgent: nullableStringSchema,
      createdAt: dateTimeSchema,
    },
  },
  SystemLogPage: pageSchema('SystemLog'),
  UserPage: pageSchema('User'),
  PermissionGroupPage: pageSchema('PermissionGroup'),
  PermissionPage: pageSchema('Permission'),
} satisfies Record<string, SchemaDefinition>;

export function schemaReference(schemaName: string): SchemaDefinition {
  return { $ref: `#/components/schemas/${schemaName}` };
}

export function arraySchemaReference(schemaName: string): SchemaDefinition {
  return {
    type: 'array',
    items: schemaReference(schemaName),
  };
}

export function registerOpenApiResponseSchemas(
  openApiDocument: OpenAPIObject,
): void {
  openApiDocument.components ??= {};
  openApiDocument.components.schemas = {
    ...openApiDocument.components.schemas,
    ...OPEN_API_RESPONSE_SCHEMAS,
  };
}
