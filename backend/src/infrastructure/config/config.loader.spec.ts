import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  loadApplicationConfiguration,
  resolveConfigurationFile,
} from './config.loader';
import { configSchema } from './config.schema';

const originalConfiguredFile = process.env.CONFIG_FILE;
const temporaryDirectories: string[] = [];

function createTemporaryDirectory(): string {
  const temporaryDirectory = mkdtempSync(
    resolve(tmpdir(), 'admin-base-configuration-'),
  );
  temporaryDirectories.push(temporaryDirectory);
  return temporaryDirectory;
}

function writeValidConfiguration(configurationFile: string): void {
  writeFileSync(
    configurationFile,
    `
app:
  port: 3100
  globalPrefix: ''
db:
  host: 127.0.0.1
  port: 5432
  user: admin_base
  password: admin_base
  database: admin_base
redis:
  host: 127.0.0.1
  port: 6379
  password: null
  db: 0
jwt:
  secret: unit-test-secret
  expiresIn: 7d
`,
  );
}

afterEach(() => {
  if (originalConfiguredFile === undefined) {
    delete process.env.CONFIG_FILE;
  } else {
    process.env.CONFIG_FILE = originalConfiguredFile;
  }
  while (temporaryDirectories.length > 0) {
    const temporaryDirectory = temporaryDirectories.pop();
    if (temporaryDirectory) {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  }
});

describe('统一配置加载器', () => {
  it('固定读取底座目录，不读取父项目的 config.yaml', () => {
    delete process.env.CONFIG_FILE;
    const projectDirectory = createTemporaryDirectory();
    const baseDirectory = resolve(projectDirectory, 'admin-base');
    mkdirSync(baseDirectory, { recursive: true });
    writeValidConfiguration(resolve(projectDirectory, 'config.yaml'));

    expect(resolveConfigurationFile(baseDirectory)).toBe(
      resolve(baseDirectory, 'config.yaml'),
    );
    expect(() => loadApplicationConfiguration(baseDirectory)).toThrow(
      '读取配置文件失败',
    );
  });

  it('显式 CONFIG_FILE 优先于默认路径', () => {
    const temporaryDirectory = createTemporaryDirectory();
    const configurationFile = resolve(
      temporaryDirectory,
      'explicit-config.yaml',
    );
    writeValidConfiguration(configurationFile);
    process.env.CONFIG_FILE = configurationFile;

    expect(resolveConfigurationFile(temporaryDirectory)).toBe(
      configurationFile,
    );
  });

  it('统一 schema 为前端、CORS 和管理员填充默认值', () => {
    const temporaryDirectory = createTemporaryDirectory();
    const configurationFile = resolve(temporaryDirectory, 'config.yaml');
    writeValidConfiguration(configurationFile);

    const loadedConfiguration =
      loadApplicationConfiguration(temporaryDirectory).configuration;

    expect(loadedConfiguration.app.corsOrigins).toEqual([
      'http://localhost:3101',
    ]);
    expect(loadedConfiguration.app.openApiEnabled).toBe(true);
    expect(loadedConfiguration.app.trustedProxyHops).toBe(0);
    expect(
      configSchema.parse({
        ...loadedConfiguration,
        app: {
          ...loadedConfiguration.app,
          openApiEnabled: false,
          trustedProxyHops: 1,
        },
      }).app,
    ).toMatchObject({
      openApiEnabled: false,
      trustedProxyHops: 1,
    });
    expect(loadedConfiguration.frontend).toEqual({
      apiUrl: null,
      apiPort: 3100,
      allowedDevOrigins: [],
    });
    expect(loadedConfiguration.bootstrap.admin).toEqual({
      username: 'admin',
      password: 'admin123456',
    });
  });

  it('配置字段非法时拒绝启动', () => {
    const temporaryDirectory = createTemporaryDirectory();
    const configurationFile = resolve(temporaryDirectory, 'config.yaml');
    writeValidConfiguration(configurationFile);
    writeFileSync(
      configurationFile,
      `${readConfiguration(configurationFile)}
frontend:
  apiUrl: not-a-url
`,
    );

    expect(() => loadApplicationConfiguration(temporaryDirectory)).toThrow(
      '配置校验失败',
    );
  });
});

function readConfiguration(configurationFile: string): string {
  return readFileSync(configurationFile, 'utf8');
}
