import { expect, test, type Page } from '@playwright/test';

const loginAndCreateSession = async (page: Page) => {
  await page.goto('/login');
  await page.getByTestId('guest-login-name').fill(`E2E ${Date.now()}`);
  await page.getByTestId('guest-login-submit').click();
  await page.waitForURL('**/app');
  await page.waitForFunction(
    () =>
      Boolean((window as Window & { __CHATBOT_AI_SOCKET_TEST__?: unknown }).__CHATBOT_AI_SOCKET_TEST__),
  );
  await page.getByTestId('create-session').click();
};

test.describe('study workspace', () => {
  test('logs in, creates a session, and receives an assistant response', async ({ page }) => {
    await loginAndCreateSession(page);

    await page.getByTestId('chat-composer-input').fill('Giải thích ngắn gọn về chuẩn hóa dữ liệu trong CSDL.');
    await page.getByTestId('chat-send-button').click();

    const assistantMessages = page.locator('[data-message-type="assistant"]');
    await expect(assistantMessages).toHaveCount(1, { timeout: 20_000 });
    await expect(assistantMessages.first()).not.toHaveAttribute('data-message-status', 'failed');
    await expect(assistantMessages.first()).toContainText(/Giải thích ngắn gọn|Short explanation/i, {
      timeout: 20_000,
    });
  });

  test('shows a recoverable failed state when offline, then retries successfully after reconnect', async ({
    page,
  }) => {
    await loginAndCreateSession(page);

    await page.getByTestId('chat-composer-input').fill('Cho mình ví dụ về khóa ngoại.');
    await page.evaluate(() =>
      (window as Window & { __CHATBOT_AI_SOCKET_TEST__?: { disconnect: () => void } }).__CHATBOT_AI_SOCKET_TEST__?.disconnect(),
    );
    await expect(page.getByTestId('connection-banner')).toBeVisible({ timeout: 15_000 });
    await page.route('**/api/chat/ask', async (route) => {
      await route.abort();
    });
    await page.getByTestId('chat-send-button').click();

    const retryButton = page.locator('[data-testid^="retry-"]').first();
    await expect(retryButton).toBeVisible({ timeout: 20_000 });

    await page.unroute('**/api/chat/ask');
    await page.evaluate(() =>
      (window as Window & { __CHATBOT_AI_SOCKET_TEST__?: { reconnect: () => void } }).__CHATBOT_AI_SOCKET_TEST__?.reconnect(),
    );
    await expect(page.getByTestId('connection-banner')).toBeHidden({ timeout: 20_000 });

    await retryButton.click();

    const assistantMessages = page.locator('[data-message-type="assistant"]');
    await expect(assistantMessages.first()).toContainText(/Ví dụ minh họa|Example|Giải thích ngắn gọn/i, {
      timeout: 20_000,
    });
    await expect(assistantMessages.first()).not.toHaveAttribute('data-message-status', 'failed');
  });

  test('allows provider switching and shows material recommendations in settings', async ({ page }) => {
    await loginAndCreateSession(page);

    await page.getByTestId('chat-composer-input').fill('Tóm tắt giúp mình kiến thức về SQL joins.');
    await page.getByTestId('chat-send-button').click();
    await expect(page.locator('[data-message-type="assistant"]').first()).toContainText(
      /Giải thích ngắn gọn|Short explanation/i,
      {
        timeout: 20_000,
      },
    );

    await page.getByTestId('open-settings').click();
    await expect(page.getByTestId('settings-sheet')).toBeVisible();
    await page.getByTestId('provider-option-OPENAI').click();

    const activeSessionCard = page.locator('[data-testid^="session-item-"]').first();
    await expect(activeSessionCard).toContainText('OPENAI');

    const materials = page.locator('[data-testid^="material-"]');
    await expect(materials.first()).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('materials-search').fill('joins');
    await expect(materials.first()).toBeVisible({ timeout: 20_000 });
  });
});
