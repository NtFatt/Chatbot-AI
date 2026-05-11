import pino from 'pino';

import { env } from './env';

export const SENSITIVE_LOG_REDACTIONS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers.Authorization',
  'req.headers.Cookie',
  'res.headers["set-cookie"]',
  'headers.authorization',
  'headers.cookie',
  'authorization',
  'cookie',
  'refreshToken',
  'accessToken',
  'tokens.accessToken',
  'tokens.refreshToken',
  'err.config.headers.Authorization',
  'err.config.headers.authorization',
  'err.request.options.headers.Authorization',
  'err.request.options.headers.authorization',
] as const;

export const createLoggerOptions = (options: {
  nodeEnv?: 'development' | 'test' | 'production';
  level?: string;
} = {}) => ({
  level: options.level ?? env.LOG_LEVEL,
  redact: {
    paths: [...SENSITIVE_LOG_REDACTIONS],
    censor: '[REDACTED]',
  },
  transport:
    (options.nodeEnv ?? env.NODE_ENV) === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'SYS:standard',
            colorize: true,
          },
        }
      : undefined,
});

export const logger = pino(createLoggerOptions());
