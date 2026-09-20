import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { SystemLogsService } from '../../application/system-logs/system-logs.service';
import {
  resolveLocale,
  translateExceptionMessage,
  type Locale,
} from '../i18n/exception-messages';
import type { AuthedRequest } from '../types/authed-request';
import { inferSystemAuditDefinition } from '../interceptors/system-audit-definition';
import { buildSystemAuditEntry } from '../interceptors/system-audit-entry';

// express Response 的最小切面(只用到 status().json())
interface HttpResponseLike {
  status(code: number): HttpResponseLike;
  json(body: unknown): unknown;
}

// Nest 的 HttpException.getResponse() 是字符串或 { statusCode, message, error } 对象,
// 这里统一摊平成 string | string[](class-validator 给数组),并按请求语言翻译
export function flattenExceptionMessage(
  exception: unknown,
  locale: Locale,
): string | string[] {
  if (!(exception instanceof HttpException)) {
    return translateExceptionMessage('Internal server error', locale);
  }
  const rawResponse = exception.getResponse();
  const message =
    typeof rawResponse === 'string'
      ? rawResponse
      : (rawResponse as { message?: unknown }).message;
  if (Array.isArray(message)) {
    return message.map((item) =>
      translateExceptionMessage(String(item), locale),
    );
  }
  return translateExceptionMessage(
    typeof message === 'string' ? message : exception.message,
    locale,
  );
}

// 全局异常兜底:统一 JSON 错误结构
@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  constructor(private readonly systemLogsService: SystemLogsService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<AuthedRequest>();
    const response = host.switchToHttp().getResponse<HttpResponseLike>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = flattenExceptionMessage(
      exception,
      resolveLocale(request.headers['accept-language']),
    );
    await this.recordGuardOrRoutingFailure(request, status, exception);
    this.logger.error(exception);
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private async recordGuardOrRoutingFailure(
    request: AuthedRequest,
    statusCode: number,
    exception: unknown,
  ): Promise<void> {
    if (request.systemAuditRecorded) {
      return;
    }
    const definition = inferSystemAuditDefinition(request);
    if (!definition) {
      return;
    }
    request.systemAuditRecorded = true;
    try {
      await this.systemLogsService.create(
        buildSystemAuditEntry({
          definition,
          request,
          status: 'failed',
          statusCode,
          errorMessage:
            exception instanceof Error ? exception.message : '未知错误',
        }),
      );
    } catch (auditError) {
      const errorMessage =
        auditError instanceof Error ? auditError.message : String(auditError);
      this.logger.error(`系统审计日志写入失败: ${errorMessage}`);
    }
  }
}
