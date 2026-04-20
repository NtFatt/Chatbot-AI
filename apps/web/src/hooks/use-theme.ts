import { useEffect } from 'react';

import { useUiStore } from '../store/ui-store';

export const useTheme = () => {
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);
};
