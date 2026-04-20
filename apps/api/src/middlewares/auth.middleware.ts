import type { NextFunction, Request, Response } from 'express';

import { failure } from '../utils/api-response';
import { verifyAccessToken } from '../utils/jwt';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.header('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return failure(req, res, 401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  try {
    const payload = verifyAccessToken(authorization.slice('Bearer '.length));
    req.auth = {
      userId: payload.sub,
      sessionId: payload.sid,
    };
    return next();
  } catch (error) {
    req.log.warn({ err: error }, 'Access token verification failed');
    return failure(req, res, 401, 'UNAUTHORIZED', 'Your session has expired. Please sign in again.');
  }
};
