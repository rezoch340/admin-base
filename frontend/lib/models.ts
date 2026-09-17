export interface PermissionTuple {
  action: string;
  subject: string;
}

export interface CatalogPermission extends PermissionTuple {
  id: number;
  description?: string | null;
}

export interface AuthenticatedUser {
  id: number;
  username: string;
  isRoot: boolean;
  permissions: PermissionTuple[];
}

export interface UserRecord {
  id: number;
  username: string;
  role: string;
  isRoot: boolean;
  enabled: boolean;
  description: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PermissionGroup {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  permissions: CatalogPermission[];
}

export interface PaginatedResponse<RowType> {
  rows: RowType[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SystemLogRecord {
  id: number;
  name: string;
  description: string;
  actorUserId: number;
  actorUsername: string;
  action: string;
  subject: string;
  targetType: string;
  targetId: string | null;
  targetName: string | null;
  metadata: Record<string, unknown>;
  method: string;
  route: string;
  status: 'succeeded' | 'failed';
  statusCode: number;
  errorMessage: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
