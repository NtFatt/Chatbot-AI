import { useQuery } from '@tanstack/react-query';

import { fetchContinueLearningSessions } from '../services/chat-service';
import { queryKeys } from '../utils/query-keys';

export const useContinueLearning = () => {
  return useQuery({
    queryKey: queryKeys.continueLearning,
    queryFn: fetchContinueLearningSessions,
    staleTime: 30_000,
  });
};
