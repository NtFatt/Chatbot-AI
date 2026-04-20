import { useEffect } from 'react';

import { getMe } from '../services/auth-service';
import { useAuthStore } from '../store/auth-store';

export const useAuthBootstrap = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const bootstrapped = useAuthStore((state) => state.bootstrapped);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const markBootstrapped = useAuthStore((state) => state.markBootstrapped);

  useEffect(() => {
    if (bootstrapped) {
      return;
    }

    let active = true;

    const bootstrap = async () => {
      if (!accessToken) {
        markBootstrapped();
        return;
      }

      try {
        const user = await getMe();
        if (active) {
          setUser(user);
        }
      } catch {
        if (active) {
          clearSession();
        }
      } finally {
        if (active) {
          markBootstrapped();
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [accessToken, bootstrapped, clearSession, markBootstrapped, setUser]);

  return {
    bootstrapped,
  };
};
