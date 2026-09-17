export function userAuthorizationCacheKey(userId: number): string {
  return `admin-base:rbac:authorization:user:${userId}`;
}
