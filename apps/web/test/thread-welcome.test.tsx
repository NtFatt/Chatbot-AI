import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThreadWelcome } from '../src/components/chat/ThreadWelcome';

afterEach(cleanup);

describe('ThreadWelcome', () => {
  it('renders subject, topic, and level chips when metadata exists', () => {
    render(
      <ThreadWelcome
        compact
        hasExternalProviders
        hasSession
        levelLabel="beginner"
        onCreateSession={vi.fn()}
        onPromptSelect={vi.fn()}
        subjectLabel="Hệ quản trị cơ sở dữ liệu"
        topicLabel="SQL joins"
      />,
    );

    expect(screen.getByTestId('thread-context-chips')).toBeTruthy();
    expect(screen.getByText(/Hệ quản trị cơ sở dữ liệu/i)).toBeTruthy();
    expect(screen.getByText(/SQL joins/i)).toBeTruthy();
    expect(screen.getByText(/Cơ bản/i)).toBeTruthy();
  });

  it('does not render empty chips when metadata is absent', () => {
    const { container } = render(
      <ThreadWelcome
        compact
        hasExternalProviders
        hasSession
        onCreateSession={vi.fn()}
        onPromptSelect={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('thread-context-chips')).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('keeps the full welcome flow functional while showing context chips', () => {
    const onPromptSelect = vi.fn();

    render(
      <ThreadWelcome
        hasExternalProviders={false}
        hasSession={false}
        levelLabel="intermediate"
        onCreateSession={vi.fn()}
        onPromptSelect={onPromptSelect}
        subjectLabel="Giải tích"
        topicLabel="Đạo hàm"
      />,
    );

    expect(screen.getByText(/Start a new learning session/i)).toBeTruthy();
    expect(screen.getByText(/Giải tích/i)).toBeTruthy();
    expect(screen.getByText(/Đạo hàm/i)).toBeTruthy();
    expect(screen.getByText(/Trung bình/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Quick prompts/i }));
    expect(screen.getByText(/Giải thích khái niệm này theo cách dễ hiểu/i)).toBeTruthy();
  });

  it('renders onboarding starters and activation content when expanded for first-run activation', () => {
    const onPromptSelect = vi.fn();

    render(
      <ThreadWelcome
        activationContent={<div data-testid="activation-content">Activation guide</div>}
        hasExternalProviders
        hasSession={false}
        onCreateSession={vi.fn()}
        onPromptSelect={onPromptSelect}
        promptItems={['Tạo 5 flashcard để mình ôn nhanh']}
        showStarterPromptsExpanded
      />,
    );

    expect(screen.getByTestId('activation-content')).toBeTruthy();
    expect(screen.getByTestId('thread-starter-prompts')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Quick prompts/i })).toBeNull();
    expect(screen.getByText(/Pick one to fill the composer quickly/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Tạo 5 flashcard để mình ôn nhanh/i }));
    expect(onPromptSelect).toHaveBeenCalledWith('Tạo 5 flashcard để mình ôn nhanh');
  });
});
