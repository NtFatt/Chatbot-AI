import { describe, expect, it, vi } from 'vitest';

import { ArtifactsService } from '../src/modules/artifacts/artifacts.service';
import { AppError } from '../src/utils/errors';

describe('ArtifactsService', () => {
  it('uses structured output as the primary artifact generation path and persists qualityScore', async () => {
    const now = new Date('2026-04-28T12:00:00.000Z');
    const structuredOutputService = {
      generate: vi.fn().mockResolvedValue({
        data: {
          content: {
            bullets: ['Ý 1', 'Ý 2', 'Ý 3'],
            keyTerms: ['SQL', 'JOIN'],
          },
          qualityScore: 0.84,
        },
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        latencyMs: 210,
        providerFallbackUsed: false,
        legacyFallbackUsed: false,
        warnings: [],
      }),
    };

    const create = vi.fn().mockResolvedValue({
      id: 'artifact-1',
      userId: 'user-1',
      sessionId: 'session-1',
      messageId: 'message-1',
      type: 'summary',
      title: 'Summary from: SQL JOIN overview',
      content: {
        bullets: ['Ý 1', 'Ý 2', 'Ý 3'],
        keyTerms: ['SQL', 'JOIN'],
      },
      isFavorited: false,
      qualityScore: 0.84,
      createdAt: now,
      updatedAt: now,
    });

    const service = new ArtifactsService(
      {
        create,
      } as never,
      {
        listProviders: vi.fn().mockResolvedValue({
          defaultProvider: 'GEMINI',
          fallbackProvider: null,
          providers: [],
        }),
      } as never,
      structuredOutputService as never,
      {
        me: vi.fn().mockResolvedValue({ preferredLanguage: 'vi' }),
      } as never,
      {
        findMessageById: vi.fn().mockResolvedValue(null),
        findSessionById: vi.fn().mockResolvedValue({ providerPreference: 'GEMINI' }),
      } as never,
    );

    const artifact = await service.generate('user-1', {
      sessionId: 'session-1',
      messageId: 'message-1',
      type: 'summary',
      sourceContent:
        'SQL JOIN là kỹ thuật kết hợp dữ liệu từ nhiều bảng dựa trên các cột liên quan để hỗ trợ truy vấn dữ liệu có cấu trúc.',
    });

    expect(structuredOutputService.generate).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        qualityScore: 0.84,
        type: 'summary',
      }),
    );
    expect(artifact.qualityScore).toBe(0.84);
  });

  it('falls back to a deterministic local artifact when providers are cooling down', async () => {
    const now = new Date('2026-04-28T12:00:00.000Z');
    const create = vi.fn().mockResolvedValue({
      id: 'artifact-2',
      userId: 'user-1',
      sessionId: 'session-1',
      messageId: 'message-1',
      type: 'summary',
      title: 'Summary from: SQL JOIN overview',
      content: {
        bullets: ['Ý 1', 'Ý 2', 'Ý 3'],
        keyTerms: ['sql', 'join'],
      },
      isFavorited: false,
      qualityScore: null,
      createdAt: now,
      updatedAt: now,
    });

    const service = new ArtifactsService(
      {
        create,
      } as never,
      {
        listProviders: vi.fn().mockResolvedValue({
          defaultProvider: 'GEMINI',
          fallbackProvider: null,
          providers: [],
        }),
      } as never,
      {
        generate: vi.fn().mockRejectedValue(
          new AppError(
            503,
            'AI_PROVIDER_COOLDOWN',
            'AI provider đang tạm nghỉ sau nhiều lỗi gần đây.',
            ['GEMINI is cooling down for another 62 seconds.'],
          ),
        ),
      } as never,
      {
        me: vi.fn().mockResolvedValue({ preferredLanguage: 'vi' }),
      } as never,
      {
        findMessageById: vi.fn().mockResolvedValue(null),
        findSessionById: vi.fn().mockResolvedValue({ providerPreference: 'GEMINI' }),
      } as never,
    );

    const artifact = await service.generate('user-1', {
      sessionId: 'session-1',
      messageId: 'message-1',
      type: 'summary',
      sourceContent:
        'SQL JOIN là kỹ thuật kết hợp dữ liệu từ nhiều bảng dựa trên các cột liên quan để hỗ trợ truy vấn dữ liệu có cấu trúc. Nó giúp người học so sánh dữ liệu giữa các bảng và xây dựng truy vấn rõ ràng hơn. Người học nên hiểu sự khác nhau giữa INNER JOIN, LEFT JOIN và FULL OUTER JOIN để tránh nhầm lẫn khi làm bài tập.',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        qualityScore: null,
        type: 'summary',
      }),
    );
    expect(Array.isArray((artifact.content as { bullets: string[] }).bullets)).toBe(true);
    expect((artifact.content as { bullets: string[] }).bullets.length).toBeGreaterThanOrEqual(3);
    expect(artifact.qualityScore).toBeNull();
  });

  it('does not score artifacts generated from degraded assistant fallback messages', async () => {
    const now = new Date('2026-04-28T12:00:00.000Z');
    const create = vi.fn().mockResolvedValue({
      id: 'artifact-3',
      userId: 'user-1',
      sessionId: 'session-1',
      messageId: 'message-fallback',
      type: 'summary',
      title: 'Summary from: Đây là phản hồi dự phòng',
      content: {
        bullets: ['Ý 1', 'Ý 2', 'Ý 3'],
        keyTerms: ['study', 'review'],
      },
      isFavorited: false,
      qualityScore: null,
      createdAt: now,
      updatedAt: now,
    });
    const structuredOutputService = {
      generate: vi.fn(),
    };

    const service = new ArtifactsService(
      {
        create,
      } as never,
      {
        listProviders: vi.fn().mockResolvedValue({
          defaultProvider: 'GEMINI',
          fallbackProvider: null,
          providers: [],
        }),
      } as never,
      structuredOutputService as never,
      {
        me: vi.fn().mockResolvedValue({ preferredLanguage: 'vi' }),
      } as never,
      {
        findMessageById: vi.fn().mockResolvedValue({
          id: 'message-fallback',
          sessionId: 'session-1',
          senderType: 'assistant',
          content:
            'Đây là phản hồi dự phòng được tạo khi provider thật đang tạm gián đoạn. Hãy xem đây như một bản hỗ trợ tạm thời để tiếp tục học.',
          fallbackUsed: true,
          errorCode: null,
          responseFinishReason: 'stop',
        }),
        findSessionById: vi.fn().mockResolvedValue({ providerPreference: 'GEMINI' }),
      } as never,
    );

    const artifact = await service.generate('user-1', {
      sessionId: 'session-1',
      messageId: 'message-fallback',
      type: 'summary',
      sourceContent: 'ignored because messageId should be resolved',
    });

    expect(structuredOutputService.generate).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: 'message-fallback',
        qualityScore: null,
        type: 'summary',
      }),
    );
    expect((artifact.content as { bullets: string[] }).bullets.length).toBeGreaterThanOrEqual(3);
    expect(artifact.qualityScore).toBeNull();
  });

  it('preserves session provenance when listing artifacts and favorites', async () => {
    const now = new Date('2026-04-29T08:00:00.000Z');
    const artifactRow = {
      id: 'artifact-1',
      userId: 'user-1',
      sessionId: 'session-1',
      session: { title: 'Database Systems' },
      messageId: 'message-1',
      type: 'summary',
      title: 'Summary from: SQL joins',
      content: {
        bullets: ['Ý 1', 'Ý 2', 'Ý 3'],
      },
      isFavorited: true,
      shareToken: 'share-token-123',
      qualityScore: 0.81,
      createdAt: now,
      updatedAt: now,
    };

    const service = new ArtifactsService(
      {
        listByUser: vi.fn().mockResolvedValue([artifactRow]),
        listFavorites: vi.fn().mockResolvedValue([artifactRow]),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const [listed] = await service.list('user-1', { limit: 20 });
    const [favorite] = await service.listFavorites('user-1');

    expect(listed?.sessionTitle).toBe('Database Systems');
    expect(listed?.isShared).toBe(true);
    expect(favorite?.sessionTitle).toBe('Database Systems');
    expect(favorite?.isShared).toBe(true);
  });

  it('preserves session provenance when toggling favorite state', async () => {
    const now = new Date('2026-04-29T09:00:00.000Z');
    const service = new ArtifactsService(
      {
        findById: vi.fn().mockResolvedValue({
          id: 'artifact-1',
          userId: 'user-1',
          sessionId: 'session-1',
          session: { title: 'Operating Systems' },
          messageId: 'message-1',
          type: 'note',
          title: 'Note from: Scheduling',
          content: { body: 'A'.repeat(60) },
          isFavorited: false,
          shareToken: null,
          qualityScore: null,
          createdAt: now,
          updatedAt: now,
        }),
        setFavorite: vi.fn().mockResolvedValue({
          id: 'artifact-1',
          userId: 'user-1',
          sessionId: 'session-1',
          session: { title: 'Operating Systems' },
          messageId: 'message-1',
          type: 'note',
          title: 'Note from: Scheduling',
          content: { body: 'A'.repeat(60) },
          isFavorited: true,
          shareToken: null,
          qualityScore: null,
          createdAt: now,
          updatedAt: now,
        }),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const toggled = await service.toggleFavorite('user-1', 'artifact-1');

    expect(toggled.isFavorited).toBe(true);
    expect(toggled.sessionTitle).toBe('Operating Systems');
  });

  it('exports summary artifacts to stable markdown', async () => {
    const now = new Date('2026-04-29T10:00:00.000Z');
    const service = new ArtifactsService(
      {
        findById: vi.fn().mockResolvedValue({
          id: 'artifact-summary',
          userId: 'user-1',
          sessionId: 'session-1',
          session: { title: 'Database Systems' },
          messageId: 'message-1',
          type: 'summary',
          title: 'Summary from: SQL joins',
          content: {
            bullets: ['Inner join returns matching rows', 'Left join keeps unmatched rows', 'Indexes improve lookup speed'],
            keyTerms: ['SQL', 'JOIN'],
          },
          isFavorited: false,
          shareToken: null,
          qualityScore: 0.88,
          createdAt: now,
          updatedAt: now,
        }),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const payload = await service.exportMarkdown('user-1', 'artifact-summary');

    expect(payload.mimeType).toBe('text/markdown');
    expect(payload.filename).toMatch(/\.md$/);
    expect(payload.markdown).toContain('# Summary from: SQL joins');
    expect(payload.markdown).toContain('## Summary');
    expect(payload.markdown).toContain('- Inner join returns matching rows');
    expect(payload.markdown).toContain('## Key Terms');
  });

  it('exports note artifacts to markdown', async () => {
    const service = new ArtifactsService(
      {
        findById: vi.fn().mockResolvedValue({
          id: 'artifact-note',
          userId: 'user-1',
          sessionId: null,
          session: null,
          messageId: null,
          type: 'note',
          title: 'Note from: OS scheduling',
          content: {
            body: 'Round-robin scheduling allocates fixed time slices to each process.',
            tags: ['os', 'scheduler'],
          },
          isFavorited: false,
          shareToken: null,
          qualityScore: null,
          createdAt: new Date('2026-04-29T10:10:00.000Z'),
          updatedAt: new Date('2026-04-29T10:10:00.000Z'),
        }),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const payload = await service.exportMarkdown('user-1', 'artifact-note');

    expect(payload.markdown).toContain('## Note');
    expect(payload.markdown).toContain('Round-robin scheduling');
    expect(payload.markdown).toContain('## Tags');
  });

  it('exports flashcards and quizzes to markdown', async () => {
    const findById = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'artifact-cards',
        userId: 'user-1',
        sessionId: null,
        session: null,
        messageId: null,
        type: 'flashcard_set',
        title: 'Flashcards from: SQL joins',
        content: [
          { front: 'What is an inner join?', back: 'It returns matching rows from both tables.' },
          { front: 'What is a left join?', back: 'It keeps all rows from the left table.' },
          { front: 'What is an index?', back: 'A data structure that speeds up lookups.' },
          { front: 'What is a primary key?', back: 'A unique identifier for each row.' },
        ],
        isFavorited: false,
        shareToken: null,
        qualityScore: null,
        createdAt: new Date('2026-04-29T10:20:00.000Z'),
        updatedAt: new Date('2026-04-29T10:20:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'artifact-quiz',
        userId: 'user-1',
        sessionId: null,
        session: null,
        messageId: null,
        type: 'quiz_set',
        title: 'Quiz from: SQL joins',
        content: [
          {
            question: 'Which join keeps all rows from the left table?',
            options: ['Inner join', 'Left join', 'Cross join', 'Self join'],
            answer: 1,
            explanation: 'Left join retains all rows from the left side.',
          },
          {
            question: 'Which structure improves lookup speed?',
            options: ['Trigger', 'Cursor', 'Index', 'View'],
            answer: 2,
          },
          {
            question: 'Which key uniquely identifies each row?',
            options: ['Foreign key', 'Primary key', 'Composite key', 'Candidate key'],
            answer: 1,
          },
          {
            question: 'Which clause groups rows?',
            options: ['ORDER BY', 'WHERE', 'GROUP BY', 'LIMIT'],
            answer: 2,
          },
        ],
        isFavorited: false,
        shareToken: null,
        qualityScore: null,
        createdAt: new Date('2026-04-29T10:25:00.000Z'),
        updatedAt: new Date('2026-04-29T10:25:00.000Z'),
      });

    const service = new ArtifactsService(
      { findById } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const flashcards = await service.exportMarkdown('user-1', 'artifact-cards');
    const quiz = await service.exportMarkdown('user-1', 'artifact-quiz');

    expect(flashcards.markdown).toContain('## Flashcards');
    expect(flashcards.markdown).toContain('### Card 1');
    expect(quiz.markdown).toContain('## Quiz');
    expect(quiz.markdown).toContain('**Correct answer:** B');
    expect(quiz.markdown).toContain('**Explanation:** Left join retains all rows from the left side.');
  });

  it('creates, reuses, and revokes share links safely', async () => {
    const now = new Date('2026-04-29T11:00:00.000Z');
    const findById = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'artifact-share',
        userId: 'user-1',
        sessionId: 'session-1',
        session: { title: 'Computer Networks' },
        messageId: 'message-1',
        type: 'summary',
        title: 'Summary from: TCP handshake',
        content: { bullets: ['A', 'B', 'C'] },
        isFavorited: false,
        shareToken: null,
        qualityScore: 0.77,
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce({
        id: 'artifact-share',
        userId: 'user-1',
        sessionId: 'session-1',
        session: { title: 'Computer Networks' },
        messageId: 'message-1',
        type: 'summary',
        title: 'Summary from: TCP handshake',
        content: { bullets: ['A', 'B', 'C'] },
        isFavorited: false,
        shareToken: 'existing-share-token',
        qualityScore: 0.77,
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce({
        id: 'artifact-share',
        userId: 'user-1',
        sessionId: 'session-1',
        session: { title: 'Computer Networks' },
        messageId: 'message-1',
        type: 'summary',
        title: 'Summary from: TCP handshake',
        content: { bullets: ['A', 'B', 'C'] },
        isFavorited: false,
        shareToken: 'existing-share-token',
        qualityScore: 0.77,
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce({
        id: 'artifact-share',
        userId: 'user-1',
        sessionId: 'session-1',
        session: { title: 'Computer Networks' },
        messageId: 'message-1',
        type: 'summary',
        title: 'Summary from: TCP handshake',
        content: { bullets: ['A', 'B', 'C'] },
        isFavorited: false,
        shareToken: null,
        qualityScore: 0.77,
        createdAt: now,
        updatedAt: now,
      });

    const setShareToken = vi.fn().mockResolvedValue({
      id: 'artifact-share',
      userId: 'user-1',
      sessionId: 'session-1',
      session: { title: 'Computer Networks' },
      messageId: 'message-1',
      type: 'summary',
      title: 'Summary from: TCP handshake',
      content: { bullets: ['A', 'B', 'C'] },
      isFavorited: false,
      shareToken: 'generated-share-token',
      qualityScore: 0.77,
      createdAt: now,
      updatedAt: now,
    });
    const clearShareToken = vi.fn().mockResolvedValue(undefined);

    const service = new ArtifactsService(
      {
        findById,
        setShareToken,
        clearShareToken,
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const created = await service.createShareLink('user-1', 'artifact-share');
    const reused = await service.createShareLink('user-1', 'artifact-share');
    const revoked = await service.revokeShareLink('user-1', 'artifact-share');
    const revokedAgain = await service.revokeShareLink('user-1', 'artifact-share');

    expect(created.isShared).toBe(true);
    expect(created.shareToken).toBe('generated-share-token');
    expect(reused.shareToken).toBe('existing-share-token');
    expect(setShareToken).toHaveBeenCalledTimes(1);
    expect(clearShareToken).toHaveBeenCalledTimes(1);
    expect(revoked.isShared).toBe(false);
    expect(revokedAgain.isShared).toBe(false);
  });

  it('returns only safe fields for public artifacts', async () => {
    const now = new Date('2026-04-29T11:10:00.000Z');
    const service = new ArtifactsService(
      {
        findByShareToken: vi.fn().mockResolvedValue({
          id: 'artifact-public',
          userId: 'user-1',
          sessionId: 'session-1',
          messageId: 'message-1',
          type: 'summary',
          title: 'Summary from: SQL joins',
          content: { bullets: ['A', 'B', 'C'] },
          isFavorited: true,
          shareToken: 'public-share-token',
          qualityScore: 0.79,
          createdAt: now,
          updatedAt: now,
        }),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const artifact = await service.getPublicArtifactByToken('public-share-token');

    expect(artifact.id).toBe('artifact-public');
    expect(artifact.title).toBe('Summary from: SQL joins');
    expect((artifact as unknown as { userId?: string }).userId).toBeUndefined();
    expect((artifact as unknown as { sessionId?: string }).sessionId).toBeUndefined();
  });
});
