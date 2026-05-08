import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

type ArtifactFixture = {
  id: string;
  userId: string;
  sessionId: string | null;
  sessionTitle: string | null;
  messageId: string | null;
  type: 'summary' | 'flashcard_set' | 'quiz_set' | 'note';
  title: string;
  content: unknown;
  isFavorited: boolean;
  isShared: boolean;
  qualityScore: number | null;
  createdAt: string;
  updatedAt: string;
};

const NOW = new Date('2026-04-29T12:00:00.000Z').toISOString();

const toSuccessEnvelope = <T>(data: T) => ({
  data,
  requestId: 'e2e-artifact-request',
  success: true,
  timestamp: NOW,
});

const toErrorEnvelope = (message: string) => ({
  error: {
    code: 'NOT_FOUND',
    message,
  },
  requestId: 'e2e-artifact-request',
  success: false,
  timestamp: NOW,
});

const fulfillJson = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: 'application/json',
    status,
  });
};

const loginAndCreateSession = async (page: Page) => {
  await page.goto('/login');
  await page.getByTestId('guest-login-name').fill(`Artifacts E2E ${Date.now()}`);
  await page.getByTestId('guest-login-submit').click();
  await page.waitForURL('**/app');
  await page.waitForFunction(
    () =>
      Boolean((window as Window & { __CHATBOT_AI_SOCKET_TEST__?: unknown }).__CHATBOT_AI_SOCKET_TEST__),
  );
  const welcomeCreateButton = page.getByRole('button', { name: 'Create first session' });
  if (await welcomeCreateButton.isVisible()) {
    await welcomeCreateButton.click();
    return;
  }

  await page.getByTitle('New conversation').click();
};

const createArtifactStore = () => {
  let activeSessionId: string | null = null;
  let artifacts: ArtifactFixture[] = [];
  const tokenToArtifactId = new Map<string, string>();

  const ensureFixtures = (sessionId: string) => {
    if (activeSessionId === sessionId && artifacts.length > 0) {
      return;
    }

    activeSessionId = sessionId;
    artifacts = [
      {
        id: 'artifact-summary',
        userId: 'user-e2e',
        sessionId,
        sessionTitle: 'Current SQL Session',
        messageId: 'message-1',
        type: 'summary',
        title: 'Normalization Summary',
        content: {
          bullets: [
            '1NF removes repeating groups.',
            '2NF removes partial dependency on composite keys.',
            '3NF removes transitive dependency.',
          ],
          keyTerms: ['1NF', '2NF', '3NF'],
        },
        isFavorited: false,
        isShared: false,
        qualityScore: 0.91,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'artifact-flashcards',
        userId: 'user-e2e',
        sessionId,
        sessionTitle: 'Current SQL Session',
        messageId: 'message-2',
        type: 'flashcard_set',
        title: 'JOIN Flashcards',
        content: [
          { back: 'Rows that match in both tables', front: 'Inner join' },
          { back: 'All left rows plus matches', front: 'Left join' },
        ],
        isFavorited: true,
        isShared: false,
        qualityScore: 0.87,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'artifact-note',
        userId: 'user-e2e',
        sessionId: 'session-previous-1',
        sessionTitle: 'Database Revision',
        messageId: 'message-3',
        type: 'note',
        title: 'Database Revision Note',
        content: {
          body: 'Practice indexing strategy before moving on to query plans.',
          tags: ['sql', 'revision'],
        },
        isFavorited: true,
        isShared: false,
        qualityScore: 0.72,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'artifact-quiz',
        userId: 'user-e2e',
        sessionId: 'session-previous-2',
        sessionTitle: 'Normalization Practice',
        messageId: 'message-4',
        type: 'quiz_set',
        title: 'Normalization Quick Quiz',
        content: [
          {
            answer: 2,
            options: ['1NF', '2NF', '3NF', 'BCNF'],
            question: 'Which normal form removes transitive dependencies?',
          },
        ],
        isFavorited: false,
        isShared: false,
        qualityScore: 0.8,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];
    tokenToArtifactId.clear();
  };

  const getBySession = (sessionId: string) => {
    ensureFixtures(sessionId);
    return artifacts.filter((artifact) => artifact.sessionId === sessionId);
  };

  const getFavorites = () => artifacts.filter((artifact) => artifact.isFavorited);

  const getAll = () => artifacts;

  const toggleFavorite = (artifactId: string) => {
    const artifact = artifacts.find((candidate) => candidate.id === artifactId);
    if (!artifact) {
      return null;
    }

    artifact.isFavorited = !artifact.isFavorited;
    artifact.updatedAt = NOW;
    return artifact;
  };

  const shareArtifact = (artifactId: string) => {
    const artifact = artifacts.find((candidate) => candidate.id === artifactId);
    if (!artifact) {
      return null;
    }

    const shareToken = 'shared-artifact-token';
    artifact.isShared = true;
    artifact.updatedAt = NOW;
    tokenToArtifactId.set(shareToken, artifactId);

    return { artifact, shareToken };
  };

  const revokeArtifact = (artifactId: string) => {
    const artifact = artifacts.find((candidate) => candidate.id === artifactId);
    if (!artifact) {
      return null;
    }

    artifact.isShared = false;
    artifact.updatedAt = NOW;
    for (const [token, currentArtifactId] of tokenToArtifactId.entries()) {
      if (currentArtifactId === artifactId) {
        tokenToArtifactId.delete(token);
      }
    }

    return artifact;
  };

  const getPublicArtifact = (shareToken: string) => {
    const artifactId = tokenToArtifactId.get(shareToken);
    if (!artifactId) {
      return null;
    }

    const artifact = artifacts.find((candidate) => candidate.id === artifactId);
    if (!artifact) {
      return null;
    }

    return {
      content: artifact.content,
      createdAt: artifact.createdAt,
      id: artifact.id,
      qualityScore: artifact.qualityScore,
      title: artifact.title,
      type: artifact.type,
    };
  };

  const getExportPayload = (artifactId: string) => {
    const artifact = artifacts.find((candidate) => candidate.id === artifactId);
    if (!artifact) {
      return null;
    }

    return {
      artifactId,
      filename: `${artifact.title.toLowerCase().replace(/\s+/g, '-')}.md`,
      markdown: `# ${artifact.title}\n\n- Exported from deterministic Phase 6C E2E coverage\n`,
      mimeType: 'text/markdown' as const,
    };
  };

  return {
    getAll,
    getBySession,
    getExportPayload,
    getFavorites,
    getPublicArtifact,
    revokeArtifact,
    shareArtifact,
    toggleFavorite,
  };
};

const installArtifactMocks = async (context: BrowserContext, store: ReturnType<typeof createArtifactStore>) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => undefined,
      },
    });
  });

  await context.route(/.*\/api\/artifacts\/session\/[^/?]+$/, async (route) => {
    const sessionId = route.request().url().split('/').pop();
    const items = sessionId ? store.getBySession(sessionId) : [];
    await fulfillJson(route, toSuccessEnvelope({ items, total: items.length }));
  });

  await context.route('**/api/artifacts/favorites', async (route) => {
    const items = store.getFavorites();
    await fulfillJson(route, toSuccessEnvelope({ items, total: items.length }));
  });

  await context.route(/.*\/api\/artifacts\?limit=50$/, async (route) => {
    const items = store.getAll();
    await fulfillJson(route, toSuccessEnvelope({ items, total: items.length }));
  });

  await context.route(/.*\/api\/artifacts\/[^/]+\/favorite$/, async (route) => {
    const artifactId = route.request().url().split('/').at(-2);
    const artifact = artifactId ? store.toggleFavorite(artifactId) : null;
    if (!artifact) {
      await fulfillJson(route, toErrorEnvelope('Artifact not found.'), 404);
      return;
    }

    await fulfillJson(route, toSuccessEnvelope(artifact));
  });

  await context.route(/.*\/api\/artifacts\/[^/]+\/export$/, async (route) => {
    const artifactId = route.request().url().split('/').at(-2);
    const payload = artifactId ? store.getExportPayload(artifactId) : null;
    if (!payload) {
      await fulfillJson(route, toErrorEnvelope('Artifact not found.'), 404);
      return;
    }

    await fulfillJson(route, toSuccessEnvelope(payload));
  });

  await context.route(/.*\/api\/artifacts\/[^/]+\/share$/, async (route) => {
    const artifactId = route.request().url().split('/').at(-2);
    if (!artifactId) {
      await fulfillJson(route, toErrorEnvelope('Artifact not found.'), 404);
      return;
    }

    if (route.request().method() === 'POST') {
      const shared = store.shareArtifact(artifactId);
      if (!shared) {
        await fulfillJson(route, toErrorEnvelope('Artifact not found.'), 404);
        return;
      }

      await fulfillJson(
        route,
        toSuccessEnvelope({
          artifactId,
          isShared: true,
          shareToken: shared.shareToken,
        }),
      );
      return;
    }

    const artifact = store.revokeArtifact(artifactId);
    if (!artifact) {
      await fulfillJson(route, toErrorEnvelope('Artifact not found.'), 404);
      return;
    }

    await fulfillJson(
      route,
      toSuccessEnvelope({
        artifactId,
        isShared: false,
      }),
    );
  });

  await context.route(/.*\/api\/public\/artifacts\/[^/?]+$/, async (route) => {
    const shareToken = route.request().url().split('/').pop();
    const artifact = shareToken ? store.getPublicArtifact(shareToken) : null;

    if (!artifact) {
      await fulfillJson(route, toErrorEnvelope('Shared artifact not found.'), 404);
      return;
    }

    await fulfillJson(route, toSuccessEnvelope(artifact));
  });
};

test.describe('artifact workspace stabilization', () => {
  test('keeps artifact workspace, export/share, and public read-only flows stable', async ({ page }) => {
    const store = createArtifactStore();
    await installArtifactMocks(page.context(), store);
    await loginAndCreateSession(page);

    await page.getByTitle('Study artifacts').click();
    const artifactDrawer = page.locator('aside').last();
    await expect(artifactDrawer.getByText('Study Artifacts', { exact: true })).toBeVisible();

    await expect(page.getByText('Normalization Summary')).toBeVisible();
    await expect(page.getByText('JOIN Flashcards')).toBeVisible();
    await expect(page.getByText('Database Revision Note')).toHaveCount(0);

    await artifactDrawer.getByRole('button', { exact: true, name: 'Favorites' }).click();
    await expect(page.getByText('Database Revision Note')).toBeVisible();
    await expect(page.getByText(/From session:/)).toHaveCount(2);
    await expect(page.getByText('Current SQL Session')).toBeVisible();
    await expect(artifactDrawer.getByText('Database Revision', { exact: true })).toBeVisible();
    await page.getByTestId('artifact-favorite-artifact-flashcards').click();
    await expect(page.getByText('JOIN Flashcards')).toHaveCount(0);
    await expect(page.getByText(/1 item from 1 session/i)).toBeVisible();

    await artifactDrawer.getByRole('button', { exact: true, name: 'All Artifacts' }).click();
    await expect(page.getByText('Normalization Summary')).toBeVisible();
    await expect(page.getByText('Normalization Quick Quiz')).toBeVisible();
    await expect(page.getByText(/4 items from 3 sessions/i)).toBeVisible();

    await artifactDrawer.getByRole('button', { exact: true, name: 'Current Session' }).click();
    const exportResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/artifacts/artifact-summary/export') && response.request().method() === 'GET',
    );
    await page.getByTestId('artifact-export-artifact-summary').click();
    await exportResponse;
    await expect(page.getByText('Markdown export ready')).toBeVisible();

    const shareResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/artifacts/artifact-summary/share') && response.request().method() === 'POST',
    );
    await page.getByTestId('artifact-share-artifact-summary').click();
    await shareResponse;
    await expect(page.getByText('Share link copied')).toBeVisible();
    await expect(page.getByTestId('artifact-revoke-share-artifact-summary')).toBeVisible();

    const publicPage = await page.context().newPage();
    const appOrigin = new URL(page.url()).origin;
    await publicPage.goto(`${appOrigin}/shared/artifacts/shared-artifact-token`);
    await expect(publicPage.getByText('Public read-only artifact')).toBeVisible();
    await expect(publicPage.getByText('Normalization Summary')).toBeVisible();
    await expect(publicPage.getByText('1NF removes repeating groups.')).toBeVisible();

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    const revokeResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/artifacts/artifact-summary/share') && response.request().method() === 'DELETE',
    );
    await page.getByTestId('artifact-revoke-share-artifact-summary').click();
    await revokeResponse;
    await expect(page.getByText('Share link revoked')).toBeVisible();

    await publicPage.reload();
    await expect(publicPage.getByText('This shared artifact is unavailable')).toBeVisible();
  });
});
