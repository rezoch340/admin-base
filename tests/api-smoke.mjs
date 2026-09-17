import assert from 'node:assert/strict';

// Run against a seeded, disposable instance (Node.js 22+):
// BASE_URL=http://127.0.0.1:3100 SMOKE_ADMIN_USERNAME=admin \
//   SMOKE_ADMIN_PASSWORD='<seed password>' node tests/api-smoke.mjs
// BASE_URL may include an API prefix. Credentials come only from environment.
// Test users/roles are soft-deleted; their immutable audit records remain.
const baseUrl = (process.env.BASE_URL ?? 'http://127.0.0.1:3100').replace(/\/+$/, '');
const adminUsername = process.env.SMOKE_ADMIN_USERNAME;
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD;
assert.ok(adminUsername && adminPassword, 'Set SMOKE_ADMIN_USERNAME and SMOKE_ADMIN_PASSWORD');

const suffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
const username = `smoke_${suffix}`;
const password = `Smoke!old_${suffix}`;
const newPassword = `Smoke!new_${suffix}`;
const startedAt = new Date().toISOString();
let adminToken;
let userId;
let roleId;
let failed = false;

function assertPublic(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    assert.ok(!/^(password|passwordHash|password_hash)$/i.test(key), `Response exposes ${key}`);
    if (typeof item === 'string') {
      assert.ok(!item.includes(password) && !item.includes(newPassword), 'Response leaks a test password');
      assert.ok(item !== adminPassword, 'Response leaks the administrator password');
    }
    assertPublic(item);
  }
}

async function request(method, path, { token = adminToken, body, status } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const expected = status ?? (method === 'POST' ? 201 : 200);
  assert.equal(response.status, expected, `${method} ${path}: expected ${expected}, got ${response.status}`);
  const result = await response.json();
  assertPublic(result);
  return result;
}

const login = (name, secret, status = 201) => request('POST', '/auth/login', {
  token: '', body: { username: name, password: secret }, status,
});
const hasPermission = (me, action, subject) => me.permissions.some(
  (permission) => permission.action === action && permission.subject === subject,
);

async function main() {
  const admin = await login(adminUsername, adminPassword);
  assert.equal(typeof admin.token, 'string');
  adminToken = admin.token;
  const adminMe = await request('GET', '/auth/me');
  assert.equal(adminMe.username, adminUsername);
  assert.equal(adminMe.isRoot, true, 'Smoke tests require the seeded root administrator');
  await request('GET', '/auth/me', { token: '', status: 401 });
  await request('GET', '/users', { token: '', status: 401 });

  const user = await request('POST', '/users', {
    body: { username, password, role: 'operator', description: 'Disposable API smoke user' },
  });
  userId = user.id;
  assert.ok(Number.isInteger(userId) && userId > 0);
  assert.equal(user.isRoot, false);
  const { token } = await login(username, password);
  const userMe = await request('GET', '/auth/me', { token });
  assert.equal(userMe.id, userId);
  assert.equal(userMe.isRoot, false);
  assert.deepEqual(userMe.permissions, []);
  await request('GET', '/users', { token, status: 403 });
  await request('GET', '/system-logs', { token, status: 403 });

  const catalog = await request('GET', '/rbac/permissions/options');
  const readUser = catalog.find((permission) => permission.action === 'read' && permission.subject === 'user');
  const manageRbac = catalog.find((permission) => permission.action === 'manage' && permission.subject === 'rbac');
  assert.ok(readUser && manageRbac, 'Run seed:admin to populate the permission catalog');
  const role = await request('POST', '/rbac/roles', { body: { name: username, description: 'API smoke role' } });
  roleId = role.id;
  assert.ok(Number.isInteger(roleId) && roleId > 0);
  const permissionPath = `/rbac/roles/${roleId}/permissions`;
  const assignmentPath = `/rbac/users/${userId}/roles`;
  await request('POST', permissionPath, { body: { permissionId: readUser.id } });
  await request('POST', assignmentPath, { body: { roleId } });
  const assigned = await request('GET', assignmentPath);
  assert.ok(assigned.some((item) => item.id === roleId && item.permissions.some((p) => p.id === readUser.id)));
  assert.ok(hasPermission(await request('GET', '/auth/me', { token }), 'read', 'user'));
  const page = await request('GET', `/users?username=${username}&page=1&pageSize=10`, { token });
  assert.equal(page.total, 1);
  assert.equal(page.rows[0].id, userId);
  assert.equal(page.pageSize, 10);

  // Reuse the same JWT throughout: changes must invalidate cached authorization.
  await request('DELETE', `${permissionPath}/${readUser.id}`);
  await request('GET', '/users', { token, status: 403 });
  assert.ok(!hasPermission(await request('GET', '/auth/me', { token }), 'read', 'user'));
  await request('POST', permissionPath, { body: { permissionId: readUser.id } });
  await request('GET', '/users', { token });
  await request('DELETE', `${assignmentPath}/${roleId}`);
  await request('GET', '/users', { token, status: 403 });
  await request('POST', assignmentPath, { body: { roleId } });
  await request('GET', '/users', { token });

  // Even manage:rbac cannot substitute for the seeded isRoot identity.
  await request('POST', permissionPath, { body: { permissionId: manageRbac.id } });
  assert.ok(hasPermission(await request('GET', '/auth/me', { token }), 'manage', 'rbac'));
  await request('GET', '/rbac/roles', { token });
  await request('PATCH', `/rbac/roles/${roleId}`, {
    token, body: { description: 'Must be denied' }, status: 403,
  });

  await request('PATCH', `/users/${userId}`, { body: { description: 'Updated by smoke test' } });
  const updated = await request('GET', `/users/${userId}`);
  assert.equal(updated.description, 'Updated by smoke test');
  await request('PATCH', `/users/${userId}/password`, { body: { password: newPassword } });
  await login(username, password, 401);
  const newSession = await login(username, newPassword);
  // Existing contract: a password change rejects the old password, but keeps JWTs valid.
  await request('GET', '/auth/me', { token });
  await request('POST', `/users/${userId}/enabled`, { body: { enabled: false } });
  await request('GET', '/auth/me', { token, status: 403 });
  await request('GET', '/auth/me', { token: newSession.token, status: 403 });
  await login(username, newPassword, 403);
  await request('POST', `/users/${userId}/enabled`, { body: { enabled: true } });
  const restored = await login(username, newPassword);
  await request('GET', '/auth/me', { token: restored.token });

  const deletedUserId = userId;
  const deletedRoleId = roleId;
  await request('DELETE', `/users/${userId}`);
  userId = undefined;
  await request('GET', '/auth/me', { token: restored.token, status: 401 });
  await request('GET', `/users/${deletedUserId}`, { status: 404 });
  await request('DELETE', `/rbac/roles/${roleId}`);
  roleId = undefined;

  const ownLogs = await request('GET', `/system-logs?actorUsername=${username}&pageSize=100`);
  assert.ok(ownLogs.rows.some((log) => log.action === 'login' && log.status === 'succeeded'));
  assert.ok(ownLogs.rows.some((log) => log.action === 'login' && log.status === 'failed' && log.statusCode === 401));
  assert.ok(ownLogs.rows.some((log) => log.subject === 'rbac' && log.status === 'failed' && log.statusCode === 403));
  const query = new URLSearchParams({ actorUsername: adminUsername, from: startedAt, pageSize: '100' });
  const adminLogs = await request('GET', `/system-logs?${query}`);
  for (const action of ['create', 'update', 'update-password', 'set-enabled', 'delete']) {
    assert.ok(adminLogs.rows.some((log) => log.subject === 'user' && log.action === action
      && log.targetId === String(deletedUserId) && log.status === 'succeeded'), `Missing user audit: ${action}`);
  }
  for (const action of ['create', 'attach-permission', 'detach-permission', 'delete']) {
    assert.ok(adminLogs.rows.some((log) => log.subject === 'rbac-role' && log.action === action
      && log.targetId === String(deletedRoleId) && log.status === 'succeeded'), `Missing role audit: ${action}`);
  }
  for (const action of ['assign-role', 'unassign-role']) {
    assert.ok(adminLogs.rows.some((log) => log.subject === 'rbac-user-role' && log.action === action
      && log.targetId === String(deletedUserId) && log.status === 'succeeded'), `Missing assignment audit: ${action}`);
  }
  console.log('PASS: login, users, live RBAC changes, root-only writes, password/disable/delete, safe audit logs');
}

try {
  await main();
} catch (error) {
  failed = true;
  console.error(`FAIL: ${error.message}`);
} finally {
  // Only remove objects created by this run; try both even if either fails.
  for (const path of [userId && `/users/${userId}`, roleId && `/rbac/roles/${roleId}`].filter(Boolean)) {
    try {
      await request('DELETE', path);
    } catch (error) {
      failed = true;
      console.error(`Cleanup failed for ${path}: ${error.message}`);
    }
  }
}
process.exitCode = failed ? 1 : 0;
