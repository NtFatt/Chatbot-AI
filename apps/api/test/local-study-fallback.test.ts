import { describe, expect, it } from 'vitest';

import { buildLocalStudyFallback } from '../src/integrations/ai/local-study-fallback';

describe('local study fallback content', () => {
  it('keeps the topic phrase intact instead of splitting it into isolated words', () => {
    const response = buildLocalStudyFallback({
      provider: 'OPENAI',
      model: 'local-study-fallback',
      language: 'bilingual',
      requestedProvider: 'OPENAI',
      warnings: [],
      messages: [
        {
          id: 'message-1',
          sessionId: 'session-1',
          clientMessageId: 'client-message-1',
          senderType: 'user',
          content: 'chủ nghĩa duy vật là gì',
          status: 'sent',
          provider: null,
          model: null,
          latencyMs: null,
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
    expect(response.contentMarkdown).toContain('Kết nối tới dịch vụ AI bên ngoài đang tạm gián đoạn');
    expect(response.contentMarkdown).toContain('The connection to the external AI service is temporarily unavailable');
    expect(response.contentMarkdown).toContain('Mở **Settings** để xem nhanh các tài liệu gợi ý');
    expect(response.contentMarkdown).not.toContain('panel tài liệu bên phải');
    expect(response.contentMarkdown).not.toContain('Local fallback mode is active');
  });
});
