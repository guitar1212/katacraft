import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';
import { ParamValidationError } from '@katacraft/shared';

/**
 * Turns validation errors thrown by shared domain logic (zod schema
 * parsing, OpenSCAD param sanitization) into 400s instead of letting them
 * fall through to Nest's default 500 handler.
 */
@Catch(ZodError, ParamValidationError)
export class DomainExceptionsFilter implements ExceptionFilter {
  catch(exception: ZodError | ParamValidationError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const message = exception instanceof ZodError ? exception.issues.map((i) => i.message).join('; ') : exception.message;
    res.status(400).json({ statusCode: 400, message, error: 'Bad Request' });
  }
}
