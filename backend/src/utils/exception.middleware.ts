import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from '@nestjs/common';

/**
 * Catches EVERY error, not just HttpException.
 *
 * This filter used to be `@Catch(HttpException)`, which meant anything else —
 * a multer rejection, a TypeError, a Mongoose validation error — bypassed it
 * entirely and fell through to Nest's default handler as a bare
 * `{"statusCode":500,"message":"Internal server error"}`, discarding the real
 * reason. Rejecting an unsupported upload was reported to the browser as an
 * opaque 500 for exactly that reason.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    try {
      const { status, message } = this.resolve(exception);

      // 4xx are answers, not failures: "device not onboarded" (404) and
      // "unsupported file type" (415) are normal outcomes the client handles.
      // Logging them at error with a stack trace made routine negative lookups
      // read as crashes. Only 5xx — where the server genuinely misbehaved —
      // gets error level and a stack.
      const context = `${request?.method} ${request?.url}`;
      if (status >= 500) {
        this.logger.error(
          `HTTP Status: ${status} Error Message: ${message}`,
          (exception as any)?.stack,
          context,
        );
      } else {
        this.logger.warn(`HTTP Status: ${status} Error Message: ${message}`, context);
      }

      // A streaming handler (e.g. file download) may already have flushed
      // headers; writing a second response would throw inside the filter.
      if (response.headersSent) return;

      response.status(status).json({
        status,
        timestamp: new Date().toISOString(),
        path: request?.url,
        message,
      });
    } catch (filterError) {
      // The filter itself must never throw: an error escaping here becomes an
      // unhandled rejection and takes the whole process down.
      this.logger.error(
        `Exception filter failed: ${(filterError as any)?.message}`,
        (filterError as any)?.stack,
        `${request?.method} ${request?.url}`,
      );
      if (!response.headersSent) {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          timestamp: new Date().toISOString(),
          path: request?.url,
          message: 'Internal server error',
        });
      }
    }
  }

  private resolve(exception: unknown): { status: number; message: string } {
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus?.() ?? HttpStatus.INTERNAL_SERVER_ERROR,
        message: this.extractMessage(exception),
      };
    }

    // Duck-typed rather than `instanceof MulterError`: multer exports the class
    // at runtime but @types/multer does not declare it.
    if (this.isMulterError(exception)) {
      return {
        status:
          exception.code === 'LIMIT_FILE_SIZE'
            ? HttpStatus.PAYLOAD_TOO_LARGE
            : HttpStatus.BAD_REQUEST,
        message: this.describeMulterError(exception),
      };
    }

    // Genuinely unexpected. Log the detail (above), but don't leak internals
    // such as stack contents or driver strings to the browser.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }

  private isMulterError(e: unknown): e is { code: string; field?: string; message?: string } {
    return !!e && typeof e === 'object' && (e as any).name === 'MulterError';
  }

  private describeMulterError(error: { code: string; field?: string; message?: string }): string {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return 'File is too large. The maximum upload size is 10 MB.';
      case 'LIMIT_FILE_COUNT':
        return 'Too many files uploaded.';
      case 'LIMIT_UNEXPECTED_FILE':
        return `Unexpected file field "${error.field}".`;
      default:
        return error.message || 'File upload failed.';
    }
  }

  /**
   * getResponse() returns whatever was handed to `new HttpException(...)`.
   * Callers used to pass `err.response.data.message` directly, which is
   * undefined whenever the upstream (Keycloak, Scorpio, registry) replies with
   * a body that has no `message` field — so every shape has to be tolerated.
   */
  private extractMessage(exception: HttpException): string {
    const res = exception.getResponse?.();

    if (typeof res === 'string') return res;

    if (res && typeof res === 'object') {
      const { message, title, error, detail } = res as Record<string, any>;
      const candidate = message ?? title ?? detail ?? error;
      if (Array.isArray(candidate)) return candidate.join(', ');
      if (typeof candidate === 'string') return candidate;
      if (candidate !== undefined && candidate !== null) return String(candidate);
    }

    // Nothing usable in the response body — fall back to the Error's own message.
    return exception.message || 'Internal server error';
  }
}
