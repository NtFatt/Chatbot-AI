import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceActivationGuide } from '../src/components/chat/WorkspaceActivationGuide';

afterEach(cleanup);

describe('WorkspaceActivationGuide', () => {
  const defaultProps = {
    hasCreatedArtifact: false,
    hasCreatedSession: false,
    hasAskedFirstQuestion: false,
    hasSession: false,
    onDismiss: vi.fn(),
    onOpenArtifacts: vi.fn(),
    onOpenInsights: vi.fn(),
  };

  it('renders the full onboarding guide with next-step copy and feature signposts', () => {
    render(
      <WorkspaceActivationGuide
        {...defaultProps}
        variant="full"
      />,
    );

    expect(screen.getByTestId('workspace-activation-guide')).toBeTruthy();
    expect(screen.getByText(/Get to the aha moment faster/i)).toBeTruthy();
    expect(screen.getByText(/Start one study thread/i)).toBeTruthy();
    expect(screen.getByText(/Study Artifacts/i)).toBeTruthy();
    expect(screen.getByText(/Learning Insights/i)).toBeTruthy();
    expect(screen.getByText(/Search/i)).toBeTruthy();
  });

  it('renders compact progress cues and forwards dismiss and feature actions', () => {
    const onDismiss = vi.fn();
    const onOpenArtifacts = vi.fn();
    const onOpenInsights = vi.fn();

    render(
      <WorkspaceActivationGuide
        {...defaultProps}
        hasCreatedSession={true}
        hasAskedFirstQuestion={true}
        hasSession={true}
        onDismiss={onDismiss}
        onOpenArtifacts={onOpenArtifacts}
        onOpenInsights={onOpenInsights}
        variant="compact"
      />,
    );

    expect(screen.getByText(/Turn a good answer into an artifact/i)).toBeTruthy();

    fireEvent.click(screen.getByTestId('workspace-activation-open-artifacts'));
    fireEvent.click(screen.getByTestId('workspace-activation-open-insights'));
    fireEvent.click(screen.getByTestId('workspace-activation-dismiss'));

    expect(onOpenArtifacts).toHaveBeenCalledTimes(1);
    expect(onOpenInsights).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
