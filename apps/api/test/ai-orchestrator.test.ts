import { describe, expect, it, vi } from 'vitest';

import { AIOrchestratorService } from '../src/integrations/ai/ai-orchestrator.service';

const buildUserMessage = (content = 'Chu nghia duy vat la gi?') => ({
  id: 'message-1',
  sessionId: 'session-1',
  clientMessageId: 'client-message-1',
  parentClientMessageId: null,
  senderType: 'user' as const,
  content,
  status: 'sent' as const,
  provider: null,
  model: null,
  providerRequestId: null,
  responseFinishReason: null,
  latencyMs: null,
  inputTokens: null,
  outputTokens: null,
  totalTokens: null,
  confidenceScore: null,
  confidenceLevel: null,
  subjectLabel: null,
  topicLabel: null,
  levelLabel: null,
  fallbackUsed: false,
  fallbackInfo: null,
  retrievalSnapshot: null,
  errorCode: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('AIOrchestratorService fallback messaging', () => {
  it('returns a structured local answer when no external providers are configured', async () => {
    const providersService = {
      listProviders: async () => ({
        defaultProvider: 'GEMINI' as const,
        fallbackProvider: null,
        providers: [],
      }),
    };

    const orchestrator = new AIOrchestratorService(
      providersService as never,
      {
        GEMINI: null,
        OPENAI: null,
      },
      {
        canAttempt: () => ({ allowed: true, cooldownRemainingMs: 0 }),
      } as never,
      {
        recordUsage: async () => undefined,
        recordIncident: async () => undefined,
      } as never,
    );

    const response = await orchestrator.generate({
      sessionProvider: 'GEMINI',
      language: 'bilingual',
      messages: [buildUserMessage()],
      userId: 'user-1',
      sessionId: 'session-1',
    });

    expect(response.finishReason).toBe('stop');
    expect(response.fallbackUsed).toBe(true);
    expect(response.fallbackInfo?.localFallbackUsed).toBe(true);
    expect(response.fallbackInfo?.notices.map((notice) => notice.category)).toEqual(
      expect.arrayContaining(['missing_credentials', 'local_fallback_used']),
    );
    expect(response.contentMarkdown).toContain('Giải thích ngắn gọn');
    expect(response.warnings.join(' ')).not.toContain('Last provider error');
  });

  it('surfaces retry timing when the primary provider is rate-limited and a secondary provider succeeds', async () => {
    const usageService = {
      recordUsage: vi.fn(),
      recordIncident: vi.fn(),
    };

    const orchestrator = new AIOrchestratorService(
      {
        listProviders: async () => ({
          defaultProvider: 'GEMINI' as const,
          fallbackProvider: 'OPENAI' as const,
          providers: [
            {
              key: 'GEMINI' as const,
              enabled: true,
              configured: true,
              model: 'gemini-2.5-flash',
              timeoutMs: 8_000,
              maxRetries: 0,
            },
            {
              key: 'OPENAI' as const,
              enabled: true,
              configured: true,
              model: 'gpt-5.4-mini',
              timeoutMs: 8_000,
              maxRetries: 0,
            },
          ],
        }),
      } as never,
      {
        GEMINI: {
          key: 'GEMINI',
          generate: async () => {
            throw new Error('429 RESOURCE_EXHAUSTED, retry in 36 seconds');
          },
        },
        OPENAI: {
          key: 'OPENAI',
          generate: async () => ({
            text: 'OpenAI fallback answer',
            finishReason: 'stop',
            latencyMs: 210,
            usage: { totalTokens: 88 },
          }),
        },
      },
      {
        canAttempt: vi.fn().mockReturnValue({ allowed: true, cooldownRemainingMs: 0 }),
        recordSuccess: vi.fn(),
        recordFailure: vi.fn(),
      } as never,
      usageService as never,
    );

    const response = await orchestrator.generate({
      sessionProvider: 'GEMINI',
      language: 'en',
      messages: [buildUserMessage('Explain SQL normalization')],
      userId: 'user-1',
      sessionId: 'session-1',
    });

    const rateLimitedNotice = response.fallbackInfo?.notices.find(
      (notice) => notice.category === 'quota_exhausted',
    );
    const secondaryNotice = response.fallbackInfo?.notices.find(
      (notice) => notice.category === 'secondary_provider_used',
    );

    expect(response.provider).toBe('OPENAI');
    expect(response.fallbackUsed).toBe(true);
    expect(response.fallbackInfo?.secondaryProviderUsed).toBe(true);
    expect(rateLimitedNotice?.provider).toBe('GEMINI');
    expect(rateLimitedNotice?.retryAfterSeconds).toBe(36);
    expect(secondaryNotice?.fallbackProvider).toBe('OPENAI');
    expect(response.warnings.join(' ')).toContain('Try again in about 36 seconds');
    expect(response.warnings.join(' ')).not.toContain('RESOURCE_EXHAUSTED');
  });

  it('labels local fallback clearly when all external providers fail', async () => {
    const orchestrator = new AIOrchestratorService(
      {
        listProviders: async () => ({
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
            },
          ],
        }),
      } as never,
      {
        GEMINI: {
          key: 'GEMINI',
          generate: async () => {
            throw new Error('429 RESOURCE_EXHAUSTED, retry in 48s');
          },
        },
        OPENAI: null,
      },
      {
        canAttempt: vi.fn().mockReturnValue({ allowed: true, cooldownRemainingMs: 0 }),
        recordSuccess: vi.fn(),
        recordFailure: vi.fn(),
      } as never,
      {
        recordUsage: vi.fn(),
        recordIncident: vi.fn(),
      } as never,
    );

    const response = await orchestrator.generate({
      sessionProvider: 'GEMINI',
      language: 'vi',
      messages: [buildUserMessage('Giải thích chủ nghĩa duy vật biện chứng')],
      userId: 'user-1',
      sessionId: 'session-1',
    });

    expect(response.fallbackUsed).toBe(true);
    expect(response.fallbackInfo?.localFallbackUsed).toBe(true);
    expect(response.fallbackInfo?.notices.map((notice) => notice.category)).toEqual(
      expect.arrayContaining(['quota_exhausted', 'local_fallback_used']),
    );
    expect(response.warnings.join(' ')).toContain('Thử lại sau khoảng 48 giây');
    expect(response.warnings.join(' ')).not.toContain('RESOURCE_EXHAUSTED');
  });
});
