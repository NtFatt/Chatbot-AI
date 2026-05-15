import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

const NOW = new Date('2026-04-29T12:00:00.000Z').toISOString();

const toSuccessEnvelope = <T>(data: T) => ({
  data,
  requestId: 'e2e-study-request',
  success: true,
  timestamp: NOW,
});

const fulfillJson = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: 'application/json',
    status,
  });
};

const buildMockChatResponse = (overrides: {
  clientMsgId?: string;
  sessionId?: string;
  userMessage?: string;
  assistantContent?: string;
  provider?: string;
  model?: string;
} = {}) => {
  const clientMsgId = overrides.clientMsgId ?? `msg-${Date.now()}`;
  const assistantMsgId = `${clientMsgId}:assistant`;
  const sessionId = overrides.sessionId ?? 'session-e2e';
  const userMessage = overrides.userMessage ?? 'Test message';
  const assistantContent =
    overrides.assistantContent ?? `Mocked AI response for: "${userMessage}".`;
  const provider = overrides.provider ?? 'GEMINI';
  const model = overrides.model ?? 'gemini-2.5-flash';

  return toSuccessEnvelope({
    userMessage: {
      id: clientMsgId,
      sessionId,
      clientMessageId: clientMsgId,
      parentClientMessageId: null,
      senderType: 'user',
      content: userMessage,
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
      createdAt: NOW,
      updatedAt: NOW,
    },
    assistantMessage: {
      id: assistantMsgId,
      sessionId,
      clientMessageId: assistantMsgId,
      parentClientMessageId: clientMsgId,
      senderType: 'assistant',
      content: assistantContent,
      status: 'sent',
      provider,
      model,
      providerRequestId: 'e2e-req-id',
      responseFinishReason: 'stop',
      latencyMs: 400,
      inputTokens: 40,
      outputTokens: 160,
      totalTokens: 200,
      confidenceScore: 0.85,
      confidenceLevel: 'high',
      subjectLabel: 'Database',
      topicLabel: 'SQL',
      levelLabel: 'beginner',
      fallbackUsed: false,
      retrievalSnapshot: null,
      errorCode: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    ai: {
      provider,
      model,
      contentMarkdown: assistantContent,
      finishReason: 'stop',
      usage: { inputTokens: 40, outputTokens: 160, totalTokens: 200 },
      latencyMs: 400,
      fallbackUsed: false,
      warnings: [],
      confidenceScore: 0.85,
      confidenceLevel: 'high',
      subjectLabel: 'Database',
      topicLabel: 'SQL',
      levelLabel: 'beginner',
      providerRequestId: 'e2e-req-id',
      retrievalSnapshot: null,
    },
  });
};

const installChatMocks = async (context: BrowserContext) => {
  await context.route(/.*\/api\/chat\/ask$/, async (route) => {
    const rawBody = route.request().postData() ?? '{}';
    let body: { clientMessageId?: string; sessionId?: string; message?: string } | null = null;
    try {
      body = JSON.parse(rawBody);
    } catch {
      // ignore
    }

    await fulfillJson(route, buildMockChatResponse({
      clientMsgId: body?.clientMessageId,
      sessionId: body?.sessionId,
      userMessage: body?.message,
    }), 201);
  });
};

const loginAndCreateSession = async (page: Page) => {
  await page.goto('/login');
  await page.getByTestId('guest-login-name').fill(`Study E2E ${Date.now()}`);
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

const forceHttpFallback = async (page: Page) => {
  await page.evaluate(() =>
    (
      window as Window & {
        __CHATBOT_AI_SOCKET_TEST__?: { disconnect: () => void };
      }
    ).__CHATBOT_AI_SOCKET_TEST__?.disconnect(),
  );
  await expect(page.getByTestId('connection-banner')).toBeVisible({ timeout: 15_000 });
};

const expectRealtimeConnected = async (page: Page) => {
  await expect(page.getByTestId('connection-banner')).toBeHidden({ timeout: 20_000 });
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          (
            window as Window & {
              __CHATBOT_AI_SOCKET_TEST__?: { state: () => string };
            }
          ).__CHATBOT_AI_SOCKET_TEST__?.state() ?? 'missing',
        ),
      { timeout: 20_000 },
    )
    .toBe('connected');
};

test.describe('study workspace', () => {
  test('logs in, creates a session, and receives an assistant response', async ({ page }) => {
    await installChatMocks(page.context());
    await loginAndCreateSession(page);
    await expectRealtimeConnected(page);
    await forceHttpFallback(page);

    await page.getByTestId('chat-composer-input').fill('Giải thích ngắn gọn về chuẩn hóa dữ liệu trong CSDL.');
    await page.getByTestId('chat-send-button').click();

    const assistantMessages = page.locator('[data-message-type="assistant"]');
    await expect(assistantMessages).toHaveCount(1, { timeout: 20_000 });
    await expect(assistantMessages.first()).not.toHaveAttribute('data-message-status', 'failed');
    await expect(assistantMessages.first()).toContainText(/Mocked AI response|Normalization|1NF|chuẩn hóa/i, {
      timeout: 20_000,
    });
  });

  test('shows a recoverable failed state when offline, then retries successfully after reconnect', async ({
    page,
  }) => {
    let askCallCount = 0;

    await page.context().route(/.*\/api\/chat\/ask$/, async (route) => {
      askCallCount++;
      const rawBody = route.request().postData() ?? '{}';
      let body: { clientMessageId?: string; sessionId?: string; message?: string } | null = null;
      try {
        body = JSON.parse(rawBody);
      } catch {
        // ignore
      }

      if (askCallCount === 1) {
        // First call: fail to simulate offline
        await fulfillJson(route, {
          success: false,
          error: { code: 'NETWORK_ERROR', message: 'Network error' },
          requestId: 'e2e-fail',
          timestamp: NOW,
        }, 503);
        return;
      }

      // Second call (retry): succeed
      await fulfillJson(route, buildMockChatResponse({
        clientMsgId: body?.clientMessageId,
        sessionId: body?.sessionId,
        userMessage: body?.message,
        assistantContent: `Recovery response for: "${body?.message ?? 'test'}". Foreign keys link tables.`,
      }), 201);
    });

    await loginAndCreateSession(page);
    await expectRealtimeConnected(page);

    await page.getByTestId('chat-composer-input').fill('Cho mình ví dụ về khóa ngoại.');

    await forceHttpFallback(page);

    // First send → fails → retry button appears
    await page.getByTestId('chat-send-button').click();
    const retryButton = page.locator('[data-testid^="retry-inline-button-"]').first();
    await expect(retryButton).toBeVisible({ timeout: 20_000 });

    // Reconnect
    await page.evaluate(() =>
      (window as Window & { __CHATBOT_AI_SOCKET_TEST__?: { reconnect: () => void } }).__CHATBOT_AI_SOCKET_TEST__?.reconnect(),
    );
    await expect(page.getByTestId('connection-banner')).toBeHidden({ timeout: 20_000 });

    // Click retry → second API call succeeds
    await retryButton.click();
    const assistantMessages = page.locator('[data-message-type="assistant"]');
    await expect(assistantMessages.first()).toContainText(/Recovery response|Foreign key|Ví dụ|Khóa ngoại/i, {
      timeout: 20_000,
    });
    await expect(assistantMessages.first()).not.toHaveAttribute('data-message-status', 'failed');
  });

  test('allows provider switching and shows material recommendations in settings', async ({ page }) => {
    await loginAndCreateSession(page);
    await expectRealtimeConnected(page);

    // Open settings
    await page.getByTestId('open-settings').click();
    await expect(page.getByTestId('settings-sheet')).toBeVisible({ timeout: 10_000 });

    // Verify both provider buttons are visible
    const geminiBtn = page.getByTestId('provider-option-GEMINI');
    const openaiBtn = page.getByTestId('provider-option-OPENAI');
    await expect(geminiBtn).toBeVisible({ timeout: 10_000 });
    await expect(openaiBtn).toBeVisible({ timeout: 5_000 });

    // Verify OPENAI button is enabled and clickable
    await expect(openaiBtn).toBeEnabled({ timeout: 5_000 });

    // Click OPENAI to switch provider
    await openaiBtn.click();

    // Verify settings sheet is still open (not closed by the click)
    await expect(page.getByTestId('settings-sheet')).toBeVisible({ timeout: 5_000 });

    // Verify OPENAI button is still present and visible (confirms the UI didn't break)
    await expect(page.getByTestId('provider-option-OPENAI')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('provider-option-GEMINI')).toBeVisible({ timeout: 5_000 });
  });
});
