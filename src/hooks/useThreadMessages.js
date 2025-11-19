import { useQuery } from '@tanstack/react-query';
import { getThreadMessages } from '../api/chat';
import { queryKeys } from './queryKeys';

export const useThreadMessages = (parentMessageId, options = {}) => {
  const { enabled = true, staleTime = 30 * 1000 } = options;

  return useQuery({
    queryKey: queryKeys.threadMessages(parentMessageId),
    queryFn: async () => {
      const { data, error } = await getThreadMessages(parentMessageId);
      if (error) {
        throw error;
      }
      return data;
    },
    enabled: enabled && !!parentMessageId,
    staleTime,
    retry: 1,
  });
};
