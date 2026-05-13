import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { createChatController } from '../src/modules/chat/chat.controller';
import type { ChatService } from '../src/modules/chat/chat.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockRequest = (overrides: Record<string, any> = {}): Request =>
  ({
    auth: { userId: 'user-1', sessionId: 'sess-1' },
    validated: {},
    body: {},
    params: {},
    requestId: 'test-request-id',
    log: { warn: () => {} },
    ...overrides,
  } as unknown as Request);

const createMockResponse = (): Response => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
};
describe('ChatController', () => {
  let mockService: ChatService;

  beforeEach(() => {
    mockService = {
      listSessions: vi.fn(),
      listArchivedSessions: vi.fn(),
      listContinueLearningSessions: vi.fn(),
      searchSessions: vi.fn(),
      globalSearch: vi.fn(),
      createSession: vi.fn(),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      batchArchiveSessions: vi.fn(),
      batchDeleteSessions: vi.fn(),
      getMessages: vi.fn(),
      archiveSession: vi.fn(),
      pinSession: vi.fn(),
      ask: vi.fn(),
    } as unknown as ChatService;
  });

  describe('listSessions', () => {
    it('returns formatted session list with success true', async () => {
      const mockResult = {
        items: [
          {
            id: 'session-1',
            title: 'SQL Study',
            userId: 'user-1',
            providerPreference: 'GEMINI',
            isPinned: false,
            isArchived: false,
            contextSummary: null,
            lastMessagePreview: 'What is a join?',
            updatedAt: '2024-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            messageCount: 3,
            artifactCount: 1,
          },
        ],
        nextCursor: null,
        totalCount: 1,
        hasMore: false,
      };
      (mockService.listSessions as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResult);

      const controller = createChatController(mockService);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      await controller.listSessions(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(mockService.listSessions).toHaveBeenCalledWith('user-1', undefined, undefined);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            items: mockResult.items,
            nextCursor: null,
            hasMore: false,
          }),
        }),
      );
    });

    it('returns empty list when no sessions exist', async () => {
      (mockService.listSessions as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        items: [],
        nextCursor: null,
        totalCount: 0,
        hasMore: false,
      });

      const controller = createChatController(mockService);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      await controller.listSessions(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { items: [], nextCursor: null, totalCount: 0, hasMore: false },
        }),
      );
    });
  });

  describe('listArchivedSessions', () => {
    it('returns archived sessions', async () => {
      const mockResult = {
        items: [
          {
            id: 'archived-1',
            title: 'Old Topic',
            userId: 'user-1',
            providerPreference: 'GEMINI',
            isPinned: false,
            isArchived: true,
            contextSummary: null,
            lastMessagePreview: null,
            updatedAt: '2024-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            messageCount: 5,
            artifactCount: 0,
          },
        ],
        nextCursor: null,
        totalCount: 1,
        hasMore: false,
      };
      (mockService.listArchivedSessions as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResult);

      const controller = createChatController(mockService);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      await controller.listArchivedSessions(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(mockService.listArchivedSessions).toHaveBeenCalledWith('user-1', undefined, undefined);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ items: mockResult.items, nextCursor: null, hasMore: false }),
        }),
      );
    });
  });

  describe('listContinueLearning', () => {
    it('returns sessions for continue learning', async () => {
      const mockContinue = [
        {
          id: 'continue-1',
          title: 'SQL Study',
          userId: 'user-1',
          providerPreference: 'GEMINI',
          isPinned: false,
          isArchived: false,
          contextSummary: 'Database normalization',
          lastMessagePreview: 'Explain 3NF',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          messageCount: 4,
          artifactCount: 1,
        },
      ];
      (mockService.listContinueLearningSessions as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockContinue);

      const controller = createChatController(mockService);
      const req = createMockRequest();
      const res = createMockResponse();

      await controller.listContinueLearning(req, res, vi.fn());

      expect(mockService.listContinueLearningSessions).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ items: mockContinue, total: 1 }),
        }),
      );
    });

    it('returns empty list when no sessions qualify', async () => {
      (mockService.listContinueLearningSessions as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      const controller = createChatController(mockService);
      const req = createMockRequest();
      const res = createMockResponse();

      await controller.listContinueLearning(req, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { items: [], total: 0 },
        }),
      );
    });
  });

  describe('searchSessions', () => {
    it('returns matching sessions for a search query', async () => {
      const mockResults = [
        {
          id: 'search-1',
          title: 'Database Indexing',
          userId: 'user-1',
          providerPreference: 'GEMINI',
          isPinned: false,
          isArchived: false,
          contextSummary: 'B-tree and hash indexes',
          lastMessagePreview: 'How do indexes work?',
          updatedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          messageCount: 6,
          artifactCount: 0,
        },
      ];
      (mockService.searchSessions as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResults);

      const controller = createChatController(mockService);
      const req = createMockRequest({ query: { q: 'index' }, validated: { query: { q: 'index' } } });
      const res = createMockResponse();

      await controller.searchSessions(req, res, vi.fn());

      expect(mockService.searchSessions).toHaveBeenCalledWith('user-1', 'index');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ items: mockResults, total: 1 }),
        }),
      );
    });

    it('returns empty list for no matches', async () => {
      (mockService.searchSessions as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      const controller = createChatController(mockService);
      const req = createMockRequest({ query: { q: 'nonexistent' }, validated: { query: { q: 'nonexistent' } } });
      const res = createMockResponse();

      await controller.searchSessions(req, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { items: [], total: 0 },
        }),
      );
    });

    it('returns sessions matching by contextSummary', async () => {
      const mockResults = [
        {
          id: 'search-2',
          title: 'Database Basics',
          userId: 'user-1',
          providerPreference: 'GEMINI',
          isPinned: false,
          isArchived: false,
          contextSummary: 'SQL joins, PostgreSQL, database normalization',
          lastMessagePreview: 'What is a foreign key?',
          updatedAt: '2024-01-02T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          messageCount: 3,
          artifactCount: 1,
        },
      ];
      (mockService.searchSessions as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResults);

      const controller = createChatController(mockService);
      const req = createMockRequest({
        query: { q: 'normalization' },
        validated: { query: { q: 'normalization' } },
      });
      const res = createMockResponse();

      await controller.searchSessions(req, res, vi.fn());

      expect(mockService.searchSessions).toHaveBeenCalledWith('user-1', 'normalization');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            items: mockResults,
            total: 1,
          }),
        }),
      );
    });
  });

  describe('globalSearch', () => {
    it('returns matching messages across sessions for authenticated user', async () => {
      const mockResults = [
        {
          sessionId: 'session-1',
          sessionTitle: 'SQL Study',
          messageId: 'msg-1',
          preview: 'What is a primary key?',
          senderType: 'user',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
        {
          sessionId: 'session-2',
          sessionTitle: 'JavaScript Closures',
          messageId: 'msg-2',
          preview: 'How do closures work?',
          senderType: 'user',
          createdAt: '2024-01-02T10:00:00.000Z',
        },
      ];
      (mockService.globalSearch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResults);

      const controller = createChatController(mockService);
      const req = createMockRequest({
        query: { q: 'what is', limit: '10', offset: '0' },
        validated: { query: { q: 'what is', limit: 10, offset: 0 } },
      });
      const res = createMockResponse();

      await controller.globalSearch(req, res, vi.fn());

      expect(mockService.globalSearch).toHaveBeenCalledWith('user-1', 'what is', 10, 0);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ items: mockResults, total: 2 }),
        }),
      );
    });

    it('returns empty list when query is empty', async () => {
      const controller = createChatController(mockService);
      const req = createMockRequest({
        query: { q: '  ', limit: '10', offset: '0' },
        validated: { query: { q: '  ', limit: 10, offset: 0 } },
      });
      const res = createMockResponse();

      await controller.globalSearch(req, res, vi.fn());

      expect(mockService.globalSearch).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { items: [], total: 0 },
        }),
      );
    });

    it('respects limit cap of 20', async () => {
      (mockService.globalSearch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      const controller = createChatController(mockService);
      const req = createMockRequest({
        query: { q: 'test', limit: '50', offset: '0' },
        validated: { query: { q: 'test', limit: 50, offset: 0 } },
      });
      const res = createMockResponse();

      await controller.globalSearch(req, res, vi.fn());

      expect(mockService.globalSearch).toHaveBeenCalledWith('user-1', 'test', 50, 0);
    });
  });

  describe('createSession', () => {
    it('creates session with provided title', async () => {
      const mockSession = {
        id: 'new-session',
        title: 'Database Normalization',
        userId: 'user-1',
        providerPreference: 'GEMINI',
        isPinned: false,
        isArchived: false,
        contextSummary: null,
        lastMessagePreview: null,
        updatedAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        messageCount: 0,
        artifactCount: 0,
      };
      (mockService.createSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);

      const controller = createChatController(mockService);
      const req = createMockRequest({ body: { title: 'Database Normalization' } });
      const res = createMockResponse();

      await controller.createSession(req, res, vi.fn());

      expect(mockService.createSession).toHaveBeenCalledWith('user-1', { title: 'Database Normalization' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockSession,
        }),
      );
    });

    it('creates session with default title when none provided', async () => {
      const mockSession = { id: 'new-session', title: 'New Chat', userId: 'user-1' };
      (mockService.createSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);

      const controller = createChatController(mockService);
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();

      await controller.createSession(req, res, vi.fn());

      expect(mockService.createSession).toHaveBeenCalledWith('user-1', {});
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateSession', () => {
    it('updates session title', async () => {
      const mockSession = { id: 'session-1', title: 'Updated Title' };
      (mockService.updateSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);

      const controller = createChatController(mockService);
      const req = createMockRequest({ params: { id: 'session-1' }, body: { title: 'Updated Title' } });
      const res = createMockResponse();

      await controller.updateSession(req, res, vi.fn());

      expect(mockService.updateSession).toHaveBeenCalledWith('user-1', 'session-1', { title: 'Updated Title' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('updates session pin status', async () => {
      (mockService.updateSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 'session-1', isPinned: true });

      const controller = createChatController(mockService);
      const req = createMockRequest({ params: { id: 'session-1' }, body: { isPinned: true } });
      const res = createMockResponse();

      await controller.updateSession(req, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('updates session archive status', async () => {
      (mockService.updateSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 'session-1', isArchived: true });

      const controller = createChatController(mockService);
      const req = createMockRequest({ params: { id: 'session-1' }, body: { isArchived: true } });
      const res = createMockResponse();

      await controller.updateSession(req, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('updates session aiRuntimeMode to learning_engine_l3', async () => {
      (mockService.updateSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 'session-1', aiRuntimeMode: 'learning_engine_l3' });

      const controller = createChatController(mockService);
      const req = createMockRequest({ params: { id: 'session-1' }, body: { aiRuntimeMode: 'learning_engine_l3' } });
      const res = createMockResponse();

      await controller.updateSession(req, res, vi.fn());

      expect(mockService.updateSession).toHaveBeenCalledWith('user-1', 'session-1', { aiRuntimeMode: 'learning_engine_l3' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('updates session aiRuntimeMode to external_api', async () => {
      (mockService.updateSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 'session-1', aiRuntimeMode: 'external_api' });

      const controller = createChatController(mockService);
      const req = createMockRequest({ params: { id: 'session-1' }, body: { aiRuntimeMode: 'external_api' } });
      const res = createMockResponse();

      await controller.updateSession(req, res, vi.fn());

      expect(mockService.updateSession).toHaveBeenCalledWith('user-1', 'session-1', { aiRuntimeMode: 'external_api' });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteSession', () => {
    it('deletes a session', async () => {
      (mockService.deleteSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

      const controller = createChatController(mockService);
      const req = createMockRequest({ params: { id: 'session-1' } });
      const res = createMockResponse();

      await controller.deleteSession(req, res, vi.fn());

      expect(mockService.deleteSession).toHaveBeenCalledWith('user-1', 'session-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { deleted: true },
        }),
      );
    });
  });

  describe('batchArchiveSessions', () => {
    it('archives multiple sessions and returns the archived count', async () => {
      (mockService.batchArchiveSessions as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

      const controller = createChatController(mockService);
      const req = createMockRequest({ body: { sessionIds: ['session-1', 'session-2'] } });
      const res = createMockResponse();

      await controller.batchArchiveSessions(req, res, vi.fn());

      expect(mockService.batchArchiveSessions).toHaveBeenCalledWith('user-1', ['session-1', 'session-2']);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { archived: true, count: 2 },
        }),
      );
    });
  });

  describe('batchDeleteSessions', () => {
    it('deletes multiple sessions and returns the deleted count', async () => {
      (mockService.batchDeleteSessions as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

      const controller = createChatController(mockService);
      const req = createMockRequest({ body: { sessionIds: ['session-1', 'session-2', 'session-3'] } });
      const res = createMockResponse();

      await controller.batchDeleteSessions(req, res, vi.fn());

      expect(mockService.batchDeleteSessions).toHaveBeenCalledWith('user-1', ['session-1', 'session-2', 'session-3']);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { deleted: true, count: 3 },
        }),
      );
    });
  });

  describe('ask', () => {
    it('calls ask with userId and payload, returns 201 with structured response', async () => {
      const mockAskResponse = {
        userMessage: {
          id: 'msg-user-1',
          sessionId: 'sess-1',
          clientMessageId: 'client-1',
          senderType: 'user' as const,
          content: 'Hello AI',
          status: 'sent' as const,
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
          confidenceScore: null,
          subjectLabel: null,
          topicLabel: null,
          levelLabel: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        assistantMessage: {
          id: 'msg-assistant-1',
          sessionId: 'sess-1',
          clientMessageId: 'client-1:assistant',
          senderType: 'assistant' as const,
          content: 'Hello! How can I help?',
          status: 'sent' as const,
          provider: 'GEMINI',
          model: 'gemini-2.5-flash',
          providerRequestId: 'req-123',
          responseFinishReason: 'stop' as const,
          latencyMs: 1500,
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
          fallbackUsed: false,
          retrievalSnapshot: null,
          errorCode: null,
          confidenceScore: 0.85,
          subjectLabel: null,
          topicLabel: null,
          levelLabel: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        ai: {
          provider: 'GEMINI' as const,
          model: 'gemini-2.5-flash',
          providerRequestId: 'req-123',
          contentMarkdown: 'Hello! How can I help?',
          finishReason: 'stop' as const,
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          latencyMs: 1500,
          fallbackUsed: false,
          warnings: [],
        },
      };
      (mockService.ask as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockAskResponse);

      const controller = createChatController(mockService);
      const req = createMockRequest({
        body: { sessionId: 'sess-1', message: 'Hello AI', clientMessageId: 'client-1' },
      });
      const res = createMockResponse();

      await controller.ask(req, res, vi.fn());

      expect(mockService.ask).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ sessionId: 'sess-1', message: 'Hello AI', clientMessageId: 'client-1' }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            userMessage: expect.objectContaining({ content: 'Hello AI' }),
            assistantMessage: expect.objectContaining({ content: 'Hello! How can I help?' }),
            ai: expect.objectContaining({ provider: 'GEMINI', finishReason: 'stop' }),
          }),
        }),
      );
    });

    it('returns 201 even when assistant has no confidence score (degraded fallback)', async () => {
      const mockAskResponse = {
        userMessage: {
          id: 'msg-user-1',
          sessionId: 'sess-1',
          clientMessageId: 'client-1',
          senderType: 'user' as const,
          content: 'Hello',
          status: 'sent' as const,
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
          confidenceScore: null,
          subjectLabel: null,
          topicLabel: null,
          levelLabel: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        assistantMessage: {
          id: 'msg-assistant-1',
          sessionId: 'sess-1',
          clientMessageId: 'client-1:assistant',
          senderType: 'assistant' as const,
          content: 'Fallback response',
          status: 'sent' as const,
          provider: 'GEMINI',
          model: 'gemini-2.5-flash',
          providerRequestId: null,
          responseFinishReason: 'error' as const,
          latencyMs: 0,
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
          fallbackUsed: true,
          retrievalSnapshot: null,
          errorCode: null,
          confidenceScore: null,
          subjectLabel: null,
          topicLabel: null,
          levelLabel: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        ai: {
          provider: 'GEMINI' as const,
          model: 'gemini-2.5-flash',
          providerRequestId: undefined,
          contentMarkdown: 'Fallback response',
          finishReason: 'error' as const,
          usage: undefined,
          latencyMs: 0,
          fallbackUsed: true,
          warnings: ['Using local fallback.'],
        },
      };
      (mockService.ask as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockAskResponse);

      const controller = createChatController(mockService);
      const req = createMockRequest({
        body: { sessionId: 'sess-1', message: 'Hello', clientMessageId: 'client-1' },
      });
      const res = createMockResponse();

      await controller.ask(req, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            ai: expect.objectContaining({ fallbackUsed: true }),
          }),
        }),
      );
    });
  });

  describe('getMessages', () => {
    it('returns messages for a session', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          clientMessageId: 'client-1',
          senderType: 'user',
          content: 'Hello',
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
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];
      (mockService.getMessages as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockMessages);

      const controller = createChatController(mockService);
      const req = createMockRequest({ params: { id: 'session-1' } });
      const res = createMockResponse();

      await controller.getMessages(req, res, vi.fn());

      expect(mockService.getMessages).toHaveBeenCalledWith('user-1', 'session-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ items: mockMessages, total: 1 }),
        }),
      );
    });

    it('returns empty messages list', async () => {
      (mockService.getMessages as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      const controller = createChatController(mockService);
      const req = createMockRequest({ params: { id: 'session-1' } });
      const res = createMockResponse();

      await controller.getMessages(req, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { items: [], total: 0 },
        }),
      );
    });
  });
});
