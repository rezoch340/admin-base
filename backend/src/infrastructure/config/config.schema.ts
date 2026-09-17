import { z } from 'zod';

// 底座仅依赖 PostgreSQL 和 Redis；校验失败时终止启动。
export const configSchema = z.object({
  app: z.object({
    port: z.number().int().positive().default(3100),
    globalPrefix: z.string().default(''),
    corsOrigins: z
      .array(z.string().min(1))
      .min(1)
      .default(['http://localhost:3101']),
    openApiEnabled: z.boolean().default(true),
    trustedProxyHops: z.number().int().min(0).max(16).default(0),
  }),
  frontend: z
    .object({
      apiUrl: z.string().url().nullable().default(null),
      apiPort: z.number().int().positive().default(3100),
      allowedDevOrigins: z.array(z.string().min(1)).default([]),
    })
    .prefault({}),
  db: z.object({
    host: z.string(),
    port: z.number().int().positive(),
    user: z.string(),
    password: z.string(),
    database: z.string(),
  }),
  redis: z.object({
    host: z.string(),
    port: z.number().int().positive(),
    password: z.string().nullable().default(null),
    db: z.number().int().min(0).default(0),
  }),
  jwt: z.object({
    secret: z.string().min(1),
    expiresIn: z.string().default('7d'),
    authorizationCacheTtlSeconds: z.number().int().min(60).max(300).default(60),
  }),
  bootstrap: z
    .object({
      admin: z
        .object({
          username: z.string().min(1).max(64).default('admin'),
          password: z.string().min(8).max(128).default('admin123456'),
        })
        .prefault({}),
    })
    .prefault({}),
});

export type AppConfig = z.infer<typeof configSchema>;
