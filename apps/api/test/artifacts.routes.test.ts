import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import {
  artifactContentUpdateSchema,
  artifactParamSchema,
  artifactQuerySchema,
  artifactRefineSchema,
  artifactReviewEventSchema,
  artifactSearchSchema,
  artifactShareTokenParamSchema,
  generateArtifactSchema,
} from '@chatbot-ai/shared';

import { validate } from '../src/middlewares/validate.middleware';
import { createArtifactsController } from '../src/modules/artifacts/artifacts.controller';
import type { ArtifactsService } from '../src/modules/artifacts/artifacts.service';
import type { ArtifactGenerateType, StudyArtifact } from '@chatbot-ai/shared';

const buildApp = (service: ArtifactsService) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = { userId: 'user-1', sessionId: 'sess-1' };
    req.requestId = 'test-request-id';
    next();
  });
  const controller = createArtifactsController(service);
  app.post('/api/artifacts/generate', validate(generateArtifactSchema, 'body'), controller.generate);
  app.get('/api/artifacts', validate(artifactQuerySchema, 'query'), controller.list);
  app.get('/api/artifacts/search', validate(artifactSearchSchema, 'query'), controller.search);
  app.get('/api/artifacts/favorites', controller.listFavorites);
  app.get('/api/artifacts/session/:sessionId', controller.listBySession);
  app.patch('/api/artifacts/:id/favorite', controller.toggleFavorite);
  app.patch('/api/artifacts/:id/content', validate(artifactParamSchema, 'params'), validate(artifactContentUpdateSchema, 'body'), controller.updateContent);
  app.patch('/api/artifacts/:id/refine', validate(artifactParamSchema, 'params'), validate(artifactRefineSchema, 'body'), controller.refine);
  app.post('/api/artifacts/:id/review-events', validate(artifactParamSchema, 'params'), validate(artifactReviewEventSchema, 'body'), controller.recordReviewEvent);
  app.get('/api/artifacts/:id/review-history', validate(artifactParamSchema, 'params'), controller.listReviewHistory);
  app.get('/api/artifacts/:id/export', validate(artifactParamSchema, 'params'), controller.exportMarkdown);
  app.post('/api/artifacts/:id/share', validate(artifactParamSchema, 'params'), controller.createShareLink);
  app.delete('/api/artifacts/:id/share', validate(artifactParamSchema, 'params'), controller.revokeShareLink);
  app.delete('/api/artifacts/:id', controller.remove);
  app.get('/api/public/artifacts/:shareToken', validate(artifactShareTokenParamSchema, 'params'), controller.getPublicArtifact);
  return app;
};

const mockArtifact = (overrides: Partial<StudyArtifact> = {}): StudyArtifact => ({
  id: 'artifact-1',
  userId: 'user-1',
  sessionId: '11111111-1111-4111-8111-111111111111',
  sessionTitle: 'Session One',
  messageId: 'msg-1',
  type: 'summary' as ArtifactGenerateType,
  title: 'Summary from: What is SQL',
  content: { bullets: ['Bullet 1', 'Bullet 2', 'Bullet 3'], keyTerms: ['SQL', 'Database'] },
  isFavorited: false,
  isShared: false,
  qualityScore: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('ArtifactsController', () => {
  describe('POST /api/artifacts/generate', () => {
    it('returns 201 with summary artifact on valid request', async () => {
      const service = {
        generate: vi.fn().mockResolvedValue(mockArtifact({
          type: 'summary',
          content: { bullets: ['Bullet 1', 'Bullet 2'], keyTerms: ['SQL'] },
        })),
      } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .post('/api/artifacts/generate')
        .send({ type: 'summary', sourceContent: 'SQL is a language for managing databases.' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('summary');
      expect(service.generate).toHaveBeenCalledWith('user-1', {
        type: 'summary',
        sourceContent: 'SQL is a language for managing databases.',
      });
    });

    it('returns 201 with note artifact on valid request', async () => {
      const service = {
        generate: vi.fn().mockResolvedValue(mockArtifact({
          type: 'note',
          content: { body: 'SQL notes body text', tags: ['sql', 'database'] },
        })),
      } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .post('/api/artifacts/generate')
        .send({ type: 'note', sourceContent: 'More detailed SQL notes content here.' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('note');
      expect(response.body.data.content.body).toBe('SQL notes body text');
    });

    it('passes messageId through to service', async () => {
      const service = {
        generate: vi.fn().mockResolvedValue(mockArtifact()),
      } as unknown as ArtifactsService;

      await request(buildApp(service))
        .post('/api/artifacts/generate')
        .send({ type: 'summary', sourceContent: 'Content here.', messageId: 'msg-99' });

      expect(service.generate).toHaveBeenCalledWith('user-1', {
        type: 'summary',
        sourceContent: 'Content here.',
        messageId: 'msg-99',
      });
    });

    it('returns 400 when content is too short', async () => {
      const service = {
        generate: vi.fn().mockRejectedValue(new Error('CONTENT_TOO_SHORT')),
      } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .post('/api/artifacts/generate')
        .send({ type: 'summary', sourceContent: 'Short' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/artifacts', () => {
    it('returns artifact list with success true', async () => {
      const artifacts = [
        mockArtifact({ id: 'a-1', type: 'summary' }),
        mockArtifact({ id: 'a-2', type: 'note' }),
      ];
      const service = {
        list: vi.fn().mockResolvedValue(artifacts),
      } as unknown as ArtifactsService;

      const response = await request(buildApp(service)).get('/api/artifacts');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.items[0].sessionTitle).toBe('Session One');
      expect(service.list).toHaveBeenCalledWith('user-1', {});
    });

    it('filters by type when query param is provided', async () => {
      const service = { list: vi.fn().mockResolvedValue([]) } as unknown as ArtifactsService;

      await request(buildApp(service))
        .get('/api/artifacts?type=summary')
        .send();

      expect(service.list).toHaveBeenCalledWith('user-1', expect.objectContaining({ type: 'summary' }));
    });
  });

  describe('GET /api/artifacts/session/:sessionId', () => {
    it('returns artifacts for a session with success true', async () => {
      const artifacts = [mockArtifact({ id: 'a-1', sessionId: '11111111-1111-4111-8111-111111111111' })];
      const service = { listBySession: vi.fn().mockResolvedValue(artifacts) } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .get('/api/artifacts/session/11111111-1111-4111-8111-111111111111');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].sessionTitle).toBe('Session One');
      expect(service.listBySession).toHaveBeenCalledWith('user-1', '11111111-1111-4111-8111-111111111111');
    });
  });

  describe('PATCH /api/artifacts/:id/content', () => {
    it('updates artifact content and returns the updated artifact', async () => {
      const service = {
        updateContent: vi.fn().mockResolvedValue(
          mockArtifact({
            content: {
              bullets: ['Updated 1', 'Updated 2', 'Updated 3'],
              keyTerms: ['SQL'],
            },
          }),
        ),
      } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .patch('/api/artifacts/7d8dd7e5-c621-476f-a7bf-2cc586a55c70/content')
        .send({
          content: {
            bullets: ['Updated 1', 'Updated 2', 'Updated 3'],
            keyTerms: ['SQL'],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(service.updateContent).toHaveBeenCalledWith('user-1', '7d8dd7e5-c621-476f-a7bf-2cc586a55c70', {
        content: {
          bullets: ['Updated 1', 'Updated 2', 'Updated 3'],
          keyTerms: ['SQL'],
        },
      });
    });
  });

  describe('PATCH /api/artifacts/:id/refine', () => {
    it('refines an artifact with a preset instruction', async () => {
      const service = {
        refine: vi.fn().mockResolvedValue(
          mockArtifact({
            qualityScore: 0.91,
            content: {
              bullets: ['Simpler 1', 'Simpler 2', 'Simpler 3'],
              keyTerms: ['SQL'],
            },
          }),
        ),
      } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .patch('/api/artifacts/7d8dd7e5-c621-476f-a7bf-2cc586a55c70/refine')
        .send({ instruction: 'make_easier' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(service.refine).toHaveBeenCalledWith('user-1', '7d8dd7e5-c621-476f-a7bf-2cc586a55c70', {
        instruction: 'make_easier',
      });
    });

    it('requires a custom instruction for custom refine mode', async () => {
      const service = {
        refine: vi.fn(),
      } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .patch('/api/artifacts/7d8dd7e5-c621-476f-a7bf-2cc586a55c70/refine')
        .send({ instruction: 'custom' });

      expect(response.status).toBe(400);
      expect(service.refine).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/artifacts/:id/review-events', () => {
    it('records a review event and returns the created entry', async () => {
      const recordedAt = new Date().toISOString();
      const service = {
        recordReviewEvent: vi.fn().mockResolvedValue({
          id: 'review-1',
          userId: 'user-1',
          artifactId: '7d8dd7e5-c621-476f-a7bf-2cc586a55c70',
          itemIndex: 1,
          selfAssessment: 'good',
          reviewedAt: recordedAt,
        }),
      } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .post('/api/artifacts/7d8dd7e5-c621-476f-a7bf-2cc586a55c70/review-events')
        .send({ itemIndex: 1, selfAssessment: 'good' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(service.recordReviewEvent).toHaveBeenCalledWith(
        'user-1',
        '7d8dd7e5-c621-476f-a7bf-2cc586a55c70',
        { itemIndex: 1, selfAssessment: 'good' },
      );
    });

    it('returns 400 for an invalid review event body', async () => {
      const service = {
        recordReviewEvent: vi.fn(),
      } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .post('/api/artifacts/7d8dd7e5-c621-476f-a7bf-2cc586a55c70/review-events')
        .send({ itemIndex: -1, selfAssessment: 'good' });

      expect(response.status).toBe(400);
      expect(service.recordReviewEvent).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/artifacts/:id/review-history', () => {
    it('returns review history entries for an artifact', async () => {
      const service = {
        listReviewHistory: vi.fn().mockResolvedValue([
          {
            id: 'review-1',
            userId: 'user-1',
            artifactId: '7d8dd7e5-c621-476f-a7bf-2cc586a55c70',
            itemIndex: 0,
            selfAssessment: 'again',
            reviewedAt: new Date().toISOString(),
          },
        ]),
      } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .get('/api/artifacts/7d8dd7e5-c621-476f-a7bf-2cc586a55c70/review-history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(1);
      expect(service.listReviewHistory).toHaveBeenCalledWith(
        'user-1',
        '7d8dd7e5-c621-476f-a7bf-2cc586a55c70',
      );
    });
  });

  describe('DELETE /api/artifacts/:id', () => {
    it('deletes artifact and returns success', async () => {
      const service = { delete: vi.fn().mockResolvedValue(undefined) } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .delete('/api/artifacts/artifact-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(true);
      expect(service.delete).toHaveBeenCalledWith('user-1', 'artifact-1');
    });
  });

  describe('GET /api/artifacts/:id/export', () => {
    it('returns markdown export payload', async () => {
      const service = {
        exportMarkdown: vi.fn().mockResolvedValue({
          artifactId: 'artifact-1',
          filename: 'sql-joins-summary.md',
          mimeType: 'text/markdown',
          markdown: '# SQL Joins Summary',
        }),
      } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .get('/api/artifacts/7d8dd7e5-c621-476f-a7bf-2cc586a55c70/export');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mimeType).toBe('text/markdown');
      expect(service.exportMarkdown).toHaveBeenCalledWith('user-1', '7d8dd7e5-c621-476f-a7bf-2cc586a55c70');
    });
  });

  describe('POST /api/artifacts/:id/share', () => {
    it('returns a share token payload', async () => {
      const service = {
        createShareLink: vi.fn().mockResolvedValue({
          artifactId: 'artifact-1',
          isShared: true,
          shareToken: 'public-share-token-123456',
        }),
      } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .post('/api/artifacts/7d8dd7e5-c621-476f-a7bf-2cc586a55c70/share');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isShared).toBe(true);
      expect(response.body.data.shareToken).toBe('public-share-token-123456');
      expect(service.createShareLink).toHaveBeenCalledWith('user-1', '7d8dd7e5-c621-476f-a7bf-2cc586a55c70');
    });
  });

  describe('DELETE /api/artifacts/:id/share', () => {
    it('revokes sharing idempotently', async () => {
      const service = {
        revokeShareLink: vi.fn().mockResolvedValue({
          artifactId: 'artifact-1',
          isShared: false,
        }),
      } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .delete('/api/artifacts/7d8dd7e5-c621-476f-a7bf-2cc586a55c70/share');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isShared).toBe(false);
      expect(service.revokeShareLink).toHaveBeenCalledWith('user-1', '7d8dd7e5-c621-476f-a7bf-2cc586a55c70');
    });
  });

  describe('GET /api/public/artifacts/:shareToken', () => {
    it('returns public artifact data without auth-only fields', async () => {
      const service = {
        getPublicArtifactByToken: vi.fn().mockResolvedValue({
          id: 'artifact-1',
          type: 'summary',
          title: 'Shared SQL Summary',
          content: { bullets: ['Bullet 1', 'Bullet 2', 'Bullet 3'] },
          qualityScore: 0.84,
          createdAt: new Date().toISOString(),
        }),
      } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .get('/api/public/artifacts/public_share_token_123456');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBeUndefined();
      expect(response.body.data.sessionId).toBeUndefined();
      expect(service.getPublicArtifactByToken).toHaveBeenCalledWith('public_share_token_123456');
    });
  });

  describe('GET /api/artifacts/search', () => {
    it('returns matching artifacts for a search query', async () => {
      const results = [
        {
          id: 'artifact-search-1',
          type: 'flashcard_set' as const,
          title: 'Flashcards from: Database indexes',
          sessionId: 'sess-2',
          sessionTitle: 'Database Systems',
          preview: 'What is an index?',
          isFavorited: false,
          createdAt: new Date().toISOString(),
        },
      ];
      const service = { searchArtifacts: vi.fn().mockResolvedValue(results) } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .get('/api/artifacts/search?q=index');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].preview).toBe('What is an index?');
      expect(service.searchArtifacts).toHaveBeenCalledWith('user-1', {
        q: 'index',
        limit: 10,
        type: undefined,
      });
    });

    it('returns empty list for no matches', async () => {
      const service = { searchArtifacts: vi.fn().mockResolvedValue([]) } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .get('/api/artifacts/search?q=nonexistentterm');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(0);
    });

    it('passes type filter to service', async () => {
      const service = { searchArtifacts: vi.fn().mockResolvedValue([]) } as unknown as ArtifactsService;

      await request(buildApp(service))
        .get('/api/artifacts/search?q=SQL&type=summary');

      expect(service.searchArtifacts).toHaveBeenCalledWith('user-1', {
        q: 'SQL',
        limit: 10,
        type: 'summary',
      });
    });
  });

  describe('GET /api/artifacts/favorites', () => {
    it('returns only favorited artifacts', async () => {
      const favorites = [
        mockArtifact({ id: 'fav-1', isFavorited: true, title: 'Favorite Quiz' }),
        mockArtifact({ id: 'fav-2', isFavorited: true, title: 'Favorite Note' }),
      ];
      const service = { listFavorites: vi.fn().mockResolvedValue(favorites) } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .get('/api/artifacts/favorites');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.items[0].sessionTitle).toBe('Session One');
      expect(service.listFavorites).toHaveBeenCalledWith('user-1');
    });

    it('returns empty list when no favorites', async () => {
      const service = { listFavorites: vi.fn().mockResolvedValue([]) } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .get('/api/artifacts/favorites');

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(0);
    });
  });

  describe('PATCH /api/artifacts/:id/favorite', () => {
    it('toggles favorite to true', async () => {
      const toggled = mockArtifact({ id: 'artifact-1', isFavorited: true });
      const service = { toggleFavorite: vi.fn().mockResolvedValue(toggled) } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .patch('/api/artifacts/artifact-1/favorite');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isFavorited).toBe(true);
      expect(service.toggleFavorite).toHaveBeenCalledWith('user-1', 'artifact-1');
    });

    it('toggles favorite to false when already favorited', async () => {
      const service = { toggleFavorite: vi.fn().mockResolvedValue(mockArtifact({ isFavorited: false })) } as unknown as ArtifactsService;

      const response = await request(buildApp(service))
        .patch('/api/artifacts/artifact-1/favorite');

      expect(response.status).toBe(200);
      expect(response.body.data.isFavorited).toBe(false);
    });
  });
});
