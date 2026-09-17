import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const administratorUsername = process.env.E2E_USERNAME ?? 'admin';
const administratorPassword = process.env.E2E_PASSWORD;
const backendBaseUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:3100';

for (const permissionTuple of [
  { action: 'manage', subject: 'rbac' },
  { action: 'read', subject: 'all' },
]) {
  test(`${permissionTuple.action}/${permissionTuple.subject} 可读取授权页面且不开放 RBAC 写入口`, async ({ page, request }) => {
    if (!administratorPassword) {
      throw new Error('请设置 E2E_PASSWORD 为底座种子管理员密码');
    }

    const loginResponse = await request.post(`${backendBaseUrl}/auth/login`, {
      data: { username: administratorUsername, password: administratorPassword },
    });
    await expect(loginResponse).toBeOK();
    const loginBody = (await loginResponse.json()) as { token: string };
    const administratorHeaders = { authorization: `Bearer ${loginBody.token}` };
    const cleanupPaths: string[] = [];

    try {
      const permissionOptionsResponse = await request.get(
        `${backendBaseUrl}/rbac/permissions/options`,
        { headers: administratorHeaders },
      );
      await expect(permissionOptionsResponse).toBeOK();
      const permissionOptions = (await permissionOptionsResponse.json()) as Array<{
        id: number;
        action: string;
        subject: string;
      }>;
      let permissionId = permissionOptions.find(
        (permission) =>
          permission.action === permissionTuple.action &&
          permission.subject === permissionTuple.subject,
      )?.id;
      if (permissionId === undefined) {
        const permissionResponse = await request.post(
          `${backendBaseUrl}/rbac/permissions`,
          { headers: administratorHeaders, data: permissionTuple },
        );
        await expect(permissionResponse).toBeOK();
        permissionId = ((await permissionResponse.json()) as { id: number }).id;
        cleanupPaths.push(`/rbac/permissions/${permissionId}`);
      }

      const fixtureName = `wildcard-${randomUUID()}`;
      const fixturePassword = randomUUID();
      const roleResponse = await request.post(`${backendBaseUrl}/rbac/roles`, {
        headers: administratorHeaders,
        data: { name: fixtureName },
      });
      await expect(roleResponse).toBeOK();
      const roleBody = (await roleResponse.json()) as { id: number };
      cleanupPaths.push(`/rbac/roles/${roleBody.id}`);

      const attachResponse = await request.post(
        `${backendBaseUrl}/rbac/roles/${roleBody.id}/permissions/${permissionId}`,
        { headers: administratorHeaders },
      );
      await expect(attachResponse).toBeOK();

      const userResponse = await request.post(`${backendBaseUrl}/users`, {
        headers: administratorHeaders,
        data: { username: fixtureName, password: fixturePassword, role: 'operator' },
      });
      await expect(userResponse).toBeOK();
      const userBody = (await userResponse.json()) as { id: number; isRoot: boolean };
      cleanupPaths.push(`/users/${userBody.id}`);
      expect(userBody.isRoot).toBe(false);

      const assignResponse = await request.post(
        `${backendBaseUrl}/rbac/users/${userBody.id}/roles/${roleBody.id}`,
        { headers: administratorHeaders },
      );
      await expect(assignResponse).toBeOK();

      await page.goto('/login');
      await page.getByLabel('用户名').fill(fixtureName);
      await page.getByLabel('密码').fill(fixturePassword);
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { name: '后台首页' })).toBeVisible();
      await expect(
        page.getByRole('region', { name: '管理入口' }).getByRole('link', { name: /^权限组/ }),
      ).toBeVisible();

      const navigation = page.getByRole('navigation');
      for (const label of ['后台账号', '系统日志']) {
        if (permissionTuple.subject === 'all') {
          await expect(navigation.getByRole('link', { name: label, exact: true })).toBeVisible();
        } else {
          await expect(navigation.getByRole('link', { name: label, exact: true })).toHaveCount(0);
        }
      }
      await navigation.getByRole('link', { name: '权限组', exact: true }).click();
      await expect(page.getByRole('heading', { name: '权限组', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: '权限目录', exact: true })).toBeVisible();
      await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
      await expect(page.getByText('当前账号没有查看此页面的权限。')).toHaveCount(0);
      await expect(page.getByText('数据加载失败')).toHaveCount(0);
      await expect(page.getByText('仅 Root 可写').first()).toBeVisible();
      await expect(page.getByRole('button', { name: '新建权限', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '新建权限组', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^操作权限/ })).toHaveCount(0);
    } finally {
      const cleanupErrors: unknown[] = [];
      for (const cleanupPath of [...cleanupPaths].reverse()) {
        try {
          const cleanupResponse = await request.delete(`${backendBaseUrl}${cleanupPath}`, {
            headers: administratorHeaders,
          });
          await expect(cleanupResponse).toBeOK();
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      expect(cleanupErrors).toEqual([]);
    }
  });
}
