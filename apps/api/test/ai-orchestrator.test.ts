import { describe, expect, it } from 'vitest';

import { AIOrchestratorService } from '../src/integrations/ai/ai-orchestrator.service';

describe('AI orchestrator local fallback', () => {
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
      messages: [
        {
          id: 'message-1',
          sessionId: 'session-1',
          clientMessageId: 'client-message-1',
          parentClientMessageId: null,
          senderType: 'user',
          content: 'Chu nghia duy vat la gi?',
          status: 'sent',
          provider: null,
          model: null,
          providerRequestId: null,
          responseFinishReason: null,
          latencyMs: null,
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
          fallbackUsed: false,
          retrievalSnapshot: null,
          errorCode: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      userId: 'user-1',
      sessionId: 'session-1',
    });

    expect(response.finishReason).toBe('stop');
    expect(response.fallbackUsed).toBe(true);
    expect(response.contentMarkdown).toContain('Giải thích ngắn gọn');
  });
});
