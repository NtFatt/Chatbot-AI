import { Writable } from 'node:stream';

import pino from 'pino';
import { describe, expect, it } from 'vitest';

import { createLoggerOptions, SENSITIVE_LOG_REDACTIONS } from '../src/config/logger';

describe('logger redaction', () => {
  it('declares the sensitive request and token fields we must never log', () => {
    expect(SENSITIVE_LOG_REDACTIONS).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'tokens.accessToken',
        'tokens.refreshToken',
      ]),
    );
  });

  it('redacts authorization headers and issued tokens in log output', () => {
    const chunks: string[] = [];
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk.toString());
        callback();
      },
    });
    const testLogger = pino(createLoggerOptions({ nodeEnv: 'test', level: 'info' }), sink);

    testLogger.info({
      req: {
        headers: {
          authorization: 'Bearer super-secret-token',
          cookie: 'refreshToken=abc123',
        },
      },
      tokens: {
        accessToken: 'access-token-value',
        refreshToken: 'refresh-token-value',
      },
    }, 'sanitized log');

    const payload = JSON.parse(chunks[0] ?? '{}') as {
      req?: { headers?: { authorization?: string; cookie?: string } };
      tokens?: { accessToken?: string; refreshToken?: string };
    };

    expect(payload.req?.headers?.authorization).toBe('[REDACTED]');
    expect(payload.req?.headers?.cookie).toBe('[REDACTED]');
    expect(payload.tokens?.accessToken).toBe('[REDACTED]');
    expect(payload.tokens?.refreshToken).toBe('[REDACTED]');
  });
});
