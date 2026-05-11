import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { globalSearch } from '../services/chat-service';
import { queryKeys } from '../utils/query-keys';

const DEBOUNCE_MS = 300;

export const useGlobalSearch = (query: string) => {
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    if (query.trim().length < 2) {
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: queryKeys.globalSearch(debouncedQuery),
    queryFn: () => globalSearch(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 10_000,
  });
};
