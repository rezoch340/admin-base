import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'js-yaml';
import { AppConfig, configSchema } from './config.schema';

export interface LoadedApplicationConfiguration {
  configurationFile: string;
  configuration: AppConfig;
}

// 源码和编译产物都固定定位到底座根目录，不能回退到宿主项目配置。
export function resolveConfigurationFile(
  configurationDirectory = resolve(__dirname, '../../../..'),
): string {
  return process.env.CONFIG_FILE
    ? resolve(process.env.CONFIG_FILE)
    : resolve(configurationDirectory, 'config.yaml');
}

export function loadApplicationConfiguration(
  configurationDirectory?: string,
): LoadedApplicationConfiguration {
  const configurationFile = resolveConfigurationFile(configurationDirectory);
  let configurationSource: unknown;
  try {
    configurationSource = load(readFileSync(configurationFile, 'utf8'));
  } catch (error) {
    throw new Error(
      `读取配置文件失败: ${configurationFile} — ${(error as Error).message}`,
    );
  }

  const validation = configSchema.safeParse(configurationSource);
  if (!validation.success) {
    throw new Error(
      `配置校验失败: ${configurationFile}\n${JSON.stringify(validation.error.format(), null, 2)}`,
    );
  }
  return {
    configurationFile,
    configuration: validation.data,
  };
}
