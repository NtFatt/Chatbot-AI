import { describe, expect, it } from 'vitest';

import { buildLocalStudyFallback } from '../src/integrations/ai/local-study-fallback';

describe('local study fallback content', () => {
  it('keeps the topic phrase intact instead of splitting it into isolated words', () => {
    const response = buildLocalStudyFallback({
      provider: 'OPENAI',
      model: 'local-study-fallback',
      language: 'bilingual',
      reason: 'missing_configuration',
      requestedProvider: 'OPENAI',
      warnings: [
        'OpenAI is not configured correctly on the server.',
        'No external AI provider is available. The app is using its local study assistant.',
      ],
      fallbackInfo: {
        localFallbackUsed: true,
        secondaryProviderUsed: false,
        notices: [
          {
            category: 'missing_credentials',
            provider: 'OPENAI',
            temporary: false,
            message:
              'OpenAI chưa có cấu hình hợp lệ trên server. / OpenAI is not configured correctly on the server.',
          },
          {
            category: 'local_fallback_used',
            provider: 'OPENAI',
            temporary: true,
            message:
              'Không có AI bên ngoài khả dụng. Hệ thống đang dùng chế độ trợ lý học tập cục bộ. / No external AI provider is available. The app is using its local study assistant.',
          },
        ],
      },
      messages: [
        {
          id: 'message-1',
          sessionId: 'session-1',
          clientMessageId: 'client-message-1',
          parentClientMessageId: null,
          senderType: 'user',
          content: 'chủ nghĩa duy vật là gì',
          status: 'sent',
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
          retrievalSnapshot: null,
          errorCode: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    expect(response.contentMarkdown).toContain('chủ nghĩa duy vật');
    expect(response.contentMarkdown).not.toContain('Hãy giải thích **chủ**');
    expect(response.contentMarkdown).not.toContain('về **nghĩa**');
    expect(response.contentMarkdown).toContain('So sánh **chủ nghĩa duy vật**');
    expect(response.contentMarkdown).toContain('Không có AI bên ngoài khả dụng');
    expect(response.contentMarkdown).toContain('No external AI provider is available');
    expect(response.contentMarkdown).toContain('**Settings**');
    expect(response.contentMarkdown).not.toContain('panel tài liệu bên phải');
    expect(response.contentMarkdown).not.toContain('Local fallback mode is active');
    expect(response.warnings.join(' ')).not.toContain('Last provider error');
  });
});
