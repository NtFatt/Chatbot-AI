import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { StructuredOutputService } from '../src/integrations/ai/structured-output.service';
import { AppError } from '../src/utils/errors';

const schema = z.object({
  value: z.string(),
});

const jsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['value'],
  properties: {
    value: { type: 'string' },
  },
} as const;

const baseProvidersState = {
  defaultProvider: 'GEMINI' as const,
  fallbackProvider: null,
  providers: [
    {
      key: 'GEMINI' as const,
      enabled: true,
      configured: true,
      model: 'gemini-2.5-flash',
      timeoutMs: 8_000,
      maxRetries: 0,
      status: 'ready',
      latencyMs: null,
      configuredFrom: 'env',
    },
  ],
};

describe('StructuredOutputService', () => {
  it('returns schema-validated structured data as the primary path', async () => {
    const provider = {
      generate: vi.fn().mockResolvedValue({
        text: '{"value":"structured"}',
        structuredData: { value: 'structured' },
        latencyMs: 120,
        usage: { totalTokens: 42 },
      }),
    };

    const usageService = {
      recordUsage: vi.fn(),
      recordIncident: vi.fn(),
    };

    const service = new StructuredOutputService(
      {
        listProviders: vi.fn().mockResolvedValue(baseProvidersState),
      } as never,
      {
        GEMINI: {
          key: 'GEMINI',
          generate: provider.generate,
        },
        OPENAI: null,
      },
      {
        canAttempt: vi.fn().mockReturnValue({ allowed: true, cooldownRemainingMs: 0 }),
        recordSuccess: vi.fn(),
        recordFailure: vi.fn(),
      } as never,
      usageService as never,
    );

    const result = await service.generate({
      userId: 'user-1',
      sessionId: 'session-1',
      sessionProvider: 'GEMINI',
      schemaName: 'test_schema',
      schemaDescription: 'Structured output test schema',
      schema,
      jsonSchema,
      systemPrompt: 'You are a test generator.',
      messages: [{ role: 'user', content: 'Return structured data.' }],
    });

    expect(result.data).toEqual({ value: 'structured' });
    expect(result.legacyFallbackUsed).toBe(false);
    expect(provider.generate).toHaveBeenCalledTimes(1);
    expect(usageService.recordIncident).not.toHaveBeenCalled();
  });

  it('falls back to the legacy parser when structured validation fails', async () => {
    const provider = {
      generate: vi
        .fn()
        .mockResolvedValueOnce({
          text: '{"unexpected":"shape"}',
          structuredData: { unexpected: 'shape' },
          latencyMs: 70,
        })
        .mockResolvedValueOnce({
          text: '{"value":"legacy rescue"}',
          latencyMs: 65,
        }),
    };

    const usageService = {
      recordUsage: vi.fn(),
      recordIncident: vi.fn(),
    };

    const service = new StructuredOutputService(
      {
        listProviders: vi.fn().mockResolvedValue(baseProvidersState),
      } as never,
      {
        GEMINI: {
          key: 'GEMINI',
          generate: provider.generate,
        },
        OPENAI: null,
      },
      {
        canAttempt: vi.fn().mockReturnValue({ allowed: true, cooldownRemainingMs: 0 }),
        recordSuccess: vi.fn(),
        recordFailure: vi.fn(),
      } as never,
      usageService as never,
    );

    const result = await service.generate({
      userId: 'user-1',
      sessionId: 'session-1',
      sessionProvider: 'GEMINI',
      schemaName: 'test_schema',
      schemaDescription: 'Structured output test schema',
      schema,
      jsonSchema,
      systemPrompt: 'Primary path should validate JSON.',
      messages: [{ role: 'user', content: 'Return structured data.' }],
      legacyFallback: {
        systemPrompt: 'Legacy rescue path',
        messages: [{ role: 'user', content: 'Return plain JSON text.' }],
        parse: (text) => JSON.parse(text) as z.infer<typeof schema>,
      },
    });

    expect(result.data).toEqual({ value: 'legacy rescue' });
    expect(result.legacyFallbackUsed).toBe(true);
    expect(result.warnings.some((warning) => warning.includes('Gemini'))).toBe(true);
    expect(result.warnings.join(' ')).not.toContain('STRUCTURED_OUTPUT_VALIDATION_FAILED');
    expect(provider.generate).toHaveBeenCalledTimes(2);
    expect(usageService.recordIncident).toHaveBeenCalledTimes(1);
  });

  it('returns a provider cooldown error when every candidate is cooling down', async () => {
    const service = new StructuredOutputService(
      {
        listProviders: vi.fn().mockResolvedValue(baseProvidersState),
      } as never,
      {
        GEMINI: {
          generate: vi.fn(),
        },
        OPENAI: null,
      } as never,
      {
        canAttempt: vi.fn().mockReturnValue({ allowed: false, cooldownRemainingMs: 62_000 }),
        recordSuccess: vi.fn(),
        recordFailure: vi.fn(),
      } as never,
      {
        recordUsage: vi.fn(),
        recordIncident: vi.fn(),
      } as never,
    );

    await expect(
      service.generate({
        userId: 'user-1',
        sessionId: 'session-1',
        sessionProvider: 'GEMINI',
        schemaName: 'test_schema',
        schemaDescription: 'Structured output test schema',
        schema,
        jsonSchema,
        systemPrompt: 'You are a test generator.',
        messages: [{ role: 'user', content: 'Return structured data.' }],
      }),
    ).rejects.toMatchObject({
      code: 'AI_PROVIDER_COOLDOWN',
      statusCode: 503,
    });
  });
});
