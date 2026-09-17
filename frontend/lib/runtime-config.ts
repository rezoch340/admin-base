import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';

export interface FrontendRuntimeConfiguration {
  apiUrl?: string;
  apiPort: number;
}

export interface FrontendApplicationConfiguration
  extends FrontendRuntimeConfiguration {
  allowedDevOrigins: string[];
}

const frontendConfigurationSchema = z.object({
  frontend: z
    .object({
      apiUrl: z.string().url().nullable().default(null),
      apiPort: z.number().int().positive().default(3100),
      allowedDevOrigins: z.array(z.string().min(1)).default([]),
    })
    .prefault({}),
});

let cachedConfiguration: FrontendApplicationConfiguration | null = null;

export function readFrontendConfiguration(): FrontendApplicationConfiguration {
  if (cachedConfiguration) {
    return cachedConfiguration;
  }

  const configurationPath = process.env.CONFIG_FILE ?? '../config.yaml';

  let parsedConfiguration: unknown;
  try {
    // 配置在运行时挂载，不追踪或打包配置文件及其所在目录。
    parsedConfiguration = parse(
      readFileSync(/* turbopackIgnore: true */ configurationPath, 'utf8'),
    );
  } catch (error) {
    throw new Error(
      `读取前端配置失败: ${configurationPath} — ${(error as Error).message}`,
    );
  }

  const validation = frontendConfigurationSchema.safeParse(parsedConfiguration);
  if (!validation.success) {
    throw new Error(
      `前端配置校验失败: ${configurationPath}\n${JSON.stringify(validation.error.format(), null, 2)}`,
    );
  }

  cachedConfiguration = {
    apiUrl: validation.data.frontend.apiUrl ?? undefined,
    apiPort: validation.data.frontend.apiPort,
    allowedDevOrigins: validation.data.frontend.allowedDevOrigins,
  };
  return cachedConfiguration;
}

export function readRuntimeConfiguration(): FrontendRuntimeConfiguration {
  const configuration = readFrontendConfiguration();
  return {
    apiUrl: configuration.apiUrl,
    apiPort: configuration.apiPort,
  };
}
