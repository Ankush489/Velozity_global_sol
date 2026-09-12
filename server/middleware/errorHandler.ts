import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const statusCode = err instanceof AppError ? err.statusCode : (err.status || err.statusCode || 500);

  // Only log internal server errors (5xx) to console.error
  if (statusCode >= 500) {
    console.error(`[Server Error] ${req.method} ${req.url}:`, err.message || err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || null,
      },
    });
  }

  // Handle SyntaxError / JSON parsing
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON_PAYLOAD',
        message: 'Malformed JSON payload in request body.',
      },
    });
  }

  // Default catch-all (never expose raw stack trace in responses)
  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: statusCode === 500 ? 'An unexpected server error occurred.' : err.message,
    },
  });
}
