import { randomUUID } from 'node:crypto';

import pinoHttp from 'pino-http';
import type { RequestHandler } from 'express';

import { logger } from '../config/logger';

const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const requestId = typeof existing === 'string' ? existing : randomUUID();
    res.setHeader('x-request-id', requestId);
    return requestId;
  },
});

export const requestContextMiddleware: RequestHandler[] = [
  httpLogger,
  (req, _res, next) => {
    req.requestId = String(req.id);
    next();
  },
];
