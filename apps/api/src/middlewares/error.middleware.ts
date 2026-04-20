import type { NextFunction, Request, Response } from 'express';

import { failure } from '../utils/api-response';
import { AppError, isAppError } from '../utils/errors';

export const notFoundMiddleware = (req: Request, res: Response) => {
  return failure(req, res, 404, 'NOT_FOUND', 'Resource not found.');
};

export const errorMiddleware = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const appError =
    isAppError(error) ? error : new AppError(500, 'INTERNAL_ERROR', 'Unexpected server error.');

  req.log.error(
    {
      err: error,
      code: appError.code,
      details: appError.details,
    },
    appError.message,
  );

  return failure(
    req,
    res,
    appError.statusCode,
    appError.code,
    appError.message,
    appError.details,
  );
};
