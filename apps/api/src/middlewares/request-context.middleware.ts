import { randomUUID } from 'node:crypto';

import pino from 'pino';
import pinoHttp from 'pino-http';
import type { RequestHandler } from 'express';

import { logger } from '../config/logger';

const redactHeaders = (headers: Record<string, unknown> | undefined) => {
  if (!headers) {
    return headers;
  }

  const sanitized = { ...headers };
  for (const headerName of ['authorization', 'Authorization', 'cookie', 'Cookie', 'set-cookie', 'Set-Cookie']) {
    if (headerName in sanitized) {
      sanitized[headerName] = '[REDACTED]';
    }
  }

  return sanitized;
};

export const serializeRequestForLog = (req: Parameters<typeof pino.stdSerializers.req>[0]) => {
  const serialized = pino.stdSerializers.req(req);
  return {
    ...serialized,
    headers: redactHeaders(serialized.headers as Record<string, unknown> | undefined),
  };
};

export const serializeResponseForLog = (res: Parameters<typeof pino.stdSerializers.res>[0]) => {
  const serialized = pino.stdSerializers.res(res);
  return {
    ...serialized,
    headers: redactHeaders(serialized.headers as Record<string, unknown> | undefined),
  };
};

const httpLogger = pinoHttp({
  logger,
  serializers: {
    req: serializeRequestForLog,
    res: serializeResponseForLog,
  },
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
