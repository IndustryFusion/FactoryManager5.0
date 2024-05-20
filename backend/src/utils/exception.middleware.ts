import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from '@nestjs/common';

@Catch(HttpException)
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const message = typeof exceptionResponse === 'string' ? exceptionResponse : (exceptionResponse as any).message;

    this.logger.error(
      `HTTP Status: ${status} Error Message: ${message}`,
      exception.stack,
      `${request.method} ${request.url}`,
    );

    response.status(status).json({
      status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}
