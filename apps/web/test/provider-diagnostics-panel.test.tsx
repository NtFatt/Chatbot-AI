import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProviderDiagnosticsPanel } from '../src/components/layout/ProviderDiagnosticsPanel';

describe('ProviderDiagnosticsPanel', () => {
  it('renders provider health and recent incidents', () => {
    render(
      <ProviderDiagnosticsPanel
        diagnostics={{
          checkedAt: new Date().toISOString(),
          defaultProvider: 'GEMINI',
          fallbackProvider: 'OPENAI',
          localFallbackEnabled: true,
          realAiAvailable: true,
          providers: [
            {
              key: 'GEMINI',
              enabled: true,
              configured: true,
              isPrimary: true,
              model: 'gemini-2.5-flash',
              timeoutMs: 25000,
              maxRetries: 1,
              healthState: 'healthy',
              cooldownRemainingMs: 0,
              runtimeSource: 'env',
              status: 'ready',
              message: 'Provider đang sẵn sàng cho các phiên hỏi đáp học tập.',
              checkedAt: new Date().toISOString(),
              latencyMs: 440,
            },
          ],
        }}
        errorMessage={null}
        incidents={{
          items: [
            {
              id: 'incident-1',
              provider: 'OPENAI',
              model: 'gpt-5.4-mini',
              errorCode: 'OPENAI_TIMEOUT',
              errorMessage: 'Provider timed out',
              retryable: true,
              requestId: 'req-1',
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
        }}
        loading={false}
        metrics={{
          items: [
            {
              provider: 'GEMINI',
              totalRequests: 8,
              successCount: 7,
              failureCount: 1,
              fallbackCount: 2,
              avgLatencyMs: 512,
              totalTokens: 1400,
              estimatedCost: 0.0012,
              lastSeenAt: new Date().toISOString(),
            },
          ],
          total: 1,
        }}
      />,
    );

    expect(screen.getByText(/Provider diagnostics/i)).toBeTruthy();
    expect(screen.getAllByText(/GEMINI/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/8 requests/i)).toBeTruthy();
    expect(screen.getByText(/Sự cố gần đây/i)).toBeTruthy();
    expect(screen.getByText(/OPENAI_TIMEOUT/i)).toBeTruthy();
  });
});
