import { expect, test } from '@playwright/test';

const username = process.env.E2E_USERNAME ?? 'admin';
const password = process.env.E2E_PASSWORD;
const backendBaseUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:3100';

test.beforeEach(async ({ page }) => {
  if (!password) {
    throw new Error('请设置 E2E_PASSWORD 为底座种子管理员密码');
  }
  await page.goto('/login');
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: '后台首页' })).toBeVisible();
});

test('登录后通用管理页面通过公开接口加载', async ({ page }) => {
  const routes = [
    ['/users', '后台账号'],
    ['/permission-groups', '权限组'],
    ['/system-logs', '系统日志'],
  ] as const;

  for (const [route, heading] of routes) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.getByText('当前账号没有查看此页面的权限。')).toHaveCount(0);
    await expect(page.locator('[data-slot="table"]')).not.toHaveCount(0);
    await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
    await expect(page.getByText('数据加载失败')).toHaveCount(0);
  }
});

test('管理列表提供字段筛选和分页', async ({ page }) => {
  const listPages = [
    { route: '/users', filters: ['账号', '展示角色', '状态'], pagers: 1 },
    { route: '/permission-groups', filters: ['权限组', '所含权限', '动作', '资源'], pagers: 2 },
    { route: '/system-logs', filters: ['事件', '操作者', '动作', '资源', '目标类型', '目标名称'], pagers: 1 },
  ] as const;

  for (const listPage of listPages) {
    await page.goto(listPage.route);
    for (const filterLabel of listPage.filters) {
      await expect(page.getByLabel(filterLabel, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByLabel('每页条数')).toHaveCount(listPage.pagers);
    await expect(page.getByRole('button', { name: '查询', exact: true })).toHaveCount(listPage.pagers);
    await expect(page.getByRole('button', { name: '重置', exact: true })).toHaveCount(listPage.pagers);
  }
});

test('账号菜单提供本人改密入口', async ({ page }) => {
  await page.getByRole('button', { name: username }).click();
  await page.getByText('修改我的密码').click();
  await expect(
    page.getByRole('heading', { name: '修改我的密码' }),
  ).toBeVisible();
  await expect(page.getByLabel('新密码')).toBeVisible();
});

test('移动端导航可以打开并进入管理页面', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '打开导航' }).click();
  const navigationDialog = page.getByRole('dialog');
  await expect(
    navigationDialog.getByText('Admin Base', { exact: true }),
  ).toBeVisible();
  await navigationDialog.getByRole('link', { name: '系统日志' }).click();
  await expect(page).toHaveURL('/system-logs');
  await expect(
    page.getByRole('heading', { name: '系统日志', exact: true }),
  ).toBeVisible();
});

test('页面切换不等待业务接口且只在内容区显示加载状态', async ({ page }) => {
  let releaseUsersRequest: (() => void) | undefined;
  let markUsersRequestStarted: (() => void) | undefined;
  const usersRequestStarted = new Promise<void>((resolve) => {
    markUsersRequestStarted = resolve;
  });
  const usersRequestCanContinue = new Promise<void>((resolve) => {
    releaseUsersRequest = resolve;
  });

  await page.route(`${backendBaseUrl}/users?*`, async (route) => {
    markUsersRequestStarted?.();
    await usersRequestCanContinue;
    await route.continue();
  });

  await page.getByRole('navigation').getByRole('link', { name: '后台账号', exact: true }).click();
  await usersRequestStarted;
  await expect(page).toHaveURL('/users');
  await expect(
    page.getByRole('heading', { name: '后台账号', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: '后台首页' })).toHaveCount(0);
  await expect(page.locator('[data-slot="skeleton"]').first()).toBeVisible();

  releaseUsersRequest?.();
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
});

test('未登录访问受保护页面会跳转登录', async ({ browser }) => {
  const isolatedContext = await browser.newContext();
  const isolatedPage = await isolatedContext.newPage();
  await isolatedPage.goto('/');
  await expect(isolatedPage).toHaveURL(/\/login$/);
  await isolatedContext.close();
});
