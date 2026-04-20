export const queryKeys = {
  auth: ['auth'] as const,
  sessions: ['sessions'] as const,
  messages: (sessionId: string) => ['messages', sessionId] as const,
  providers: ['providers'] as const,
  recommendations: (sessionId: string, query: string) =>
    ['recommendations', sessionId, query] as const,
  searchMaterials: (query: string) => ['materials-search', query] as const,
};
