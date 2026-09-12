import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed.',
            details: err.issues.map((i) => ({
              field: i.path.join('.'),
              message: i.message,
            })),
          },
        });
      }
      next(err);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'QUERY_VALIDATION_ERROR',
            message: 'Invalid query parameters.',
            details: err.issues.map((i) => ({
              field: i.path.join('.'),
              message: i.message,
            })),
          },
        });
      }
      next(err);
    }
  };
}
