import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { PaginatedResponse, StudyArtifact } from '@chatbot-ai/shared';

import { searchArtifacts, fetchFavorites, toggleFavorite } from '../services/artifacts-service';
import { queryKeys } from '../utils/query-keys';
import type { ArtifactType } from '@chatbot-ai/shared';

const DEBOUNCE_MS = 300;

export const useArtifactSearch = (query: string) => {
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
    queryKey: queryKeys.artifactSearch(debouncedQuery),
    queryFn: () => searchArtifacts({ q: debouncedQuery, limit: 10 }),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 10_000,
  });
};

export const useFavorites = (enabled = true) => {
  return useQuery({
    enabled,
    queryKey: queryKeys.artifactFavorites(),
    queryFn: fetchFavorites,
    staleTime: 30_000,
  });
};

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleFavorite,
    onSuccess: (updated) => {
      queryClient.setQueryData<PaginatedResponse<StudyArtifact>>(
        queryKeys.artifactFavorites(),
        (old) => {
          if (!old) return old;
          const exists = old.items.some((a) => a.id === updated.id);
          return {
            ...old,
            items: exists
              ? old.items.map((a) => (a.id === updated.id ? updated : a))
              : [...old.items, updated],
            total: updated.isFavorited
              ? old.total + 1
              : old.total - 1,
          };
        },
      );
    },
  });
};

export const useFavoriteCount = () => {
  const { data } = useFavorites();
  return data?.total ?? 0;
};

export const filterArtifactsByType = (
  artifacts: Array<{ type: ArtifactType }>,
  filter: ArtifactType | 'all',
) => {
  if (filter === 'all') return artifacts;
  return artifacts.filter((a) => a.type === filter);
};
