import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY_PREFIX = 'workspace-activation-dismissed';

export const useWorkspaceActivation = (userId?: string | null) => {
  const storageKey = useMemo(
    () => (userId ? `${STORAGE_KEY_PREFIX}:${userId}` : null),
    [userId],
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!storageKey) {
      setDismissed(false);
      return;
    }

    try {
      setDismissed(window.localStorage.getItem(storageKey) === '1');
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  const dismiss = useCallback(() => {
    setDismissed(true);

    if (!storageKey) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {
      // Ignore localStorage failures so onboarding never blocks the workspace.
    }
  }, [storageKey]);

  return {
    dismiss,
    dismissed,
  };
};
