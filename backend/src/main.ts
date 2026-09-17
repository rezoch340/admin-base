import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { rejectNullByte } from './common/middleware/reject-null-byte.middleware';
import { buildOpenApiConfiguration } from './common/openapi/openapi.configuration';
import { completeOpenApiDocument } from './common/openapi/openapi.document';
import { ConfigService } from './infrastructure/config/config.service';

// 通用管理 API 入口：HTTP API 与可选 Swagger
async function bootstrap() {
  // 记录异步任务的未处理异常。
  process.on('unhandledRejection', (reason) => {
    new Logger('Process').error(
      `未处理的 Promise 拒绝: ${reason instanceof Error ? reason.message : String(reason)}`,
    );
  });

  const application =
    await NestFactory.create<NestExpressApplication>(AppModule);
  const configuration = application.get(ConfigService);

  if (configuration.app.trustedProxyHops > 0) {
    application.set('trust proxy', configuration.app.trustedProxyHops);
  }
  if (configuration.app.globalPrefix) {
    application.setGlobalPrefix(configuration.app.globalPrefix);
  }
  // 必须在校验管道之前:IsString 认为含 NUL 的字符串合法,放过去要到 pg 驱动才炸成 500
  application.use(rejectNullByte);
  application.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  const configuredCorsOrigins = configuration.app.corsOrigins;
  application.enableCors({
    credentials: false,
    origin: configuredCorsOrigins.includes('*') ? true : configuredCorsOrigins,
  });
  application.enableShutdownHooks();

  if (configuration.app.openApiEnabled) {
    const swaggerConfiguration = buildOpenApiConfiguration();
    const openApiDocument = completeOpenApiDocument(
      SwaggerModule.createDocument(application, swaggerConfiguration),
    );
    SwaggerModule.setup('docs', application, openApiDocument);
  }

  try {
    // listen 会先等待模块初始化（包括数据库迁移），完成后才开放 HTTP 端口。
    await application.listen(configuration.app.port);
  } catch (error) {
    await application.close();
    throw error;
  }
}
void bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').error(
    '后端启动失败',
    error instanceof Error ? error.stack : String(error),
  );
  process.exitCode = 1;
});
