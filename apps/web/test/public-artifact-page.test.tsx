import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PublicArtifactPage } from '../src/features/public/PublicArtifactPage';

vi.mock('../src/services/artifacts-service', () => ({
  fetchPublicArtifact: vi.fn(),
}));

import { fetchPublicArtifact } from '../src/services/artifacts-service';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPage = (initialPath = '/shared/artifacts/share-token-123') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/shared/artifacts/:shareToken" element={<PublicArtifactPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('PublicArtifactPage', () => {
  it('renders loading and then the public artifact', async () => {
    vi.mocked(fetchPublicArtifact).mockResolvedValue({
      id: 'artifact-1',
      type: 'summary',
      title: 'Shared SQL Summary',
      content: {
        bullets: ['Bullet 1', 'Bullet 2', 'Bullet 3'],
      },
      qualityScore: 0.82,
      createdAt: new Date('2026-04-29T12:00:00.000Z').toISOString(),
    });

    renderPage();

    expect(screen.getByText(/Loading shared artifact/i)).toBeTruthy();
    await screen.findByText('Shared SQL Summary');
    expect(screen.getByText('Bullet 1')).toBeTruthy();
  });

  it('shows unavailable state for revoked or missing links', async () => {
    vi.mocked(fetchPublicArtifact).mockRejectedValue(new Error('Shared artifact not found.'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/This shared artifact is unavailable/i)).toBeTruthy();
    });
  });
});
