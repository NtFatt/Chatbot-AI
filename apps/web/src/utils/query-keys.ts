export const queryKeys = {
  auth: ['auth'] as const,
  sessions: ['sessions'] as const,
  archivedSessions: ['archived-sessions'] as const,
  messages: (sessionId: string) => ['messages', sessionId] as const,
  providers: ['providers'] as const,
  providerDiagnostics: ['providers-diagnostics'] as const,
  providerMetrics: ['providers-metrics'] as const,
  providerIncidents: ['providers-incidents'] as const,
  usage: (sessionId?: string | null) => ['chat-usage', sessionId ?? 'all'] as const,
  recommendations: (sessionId: string, query: string) =>
    ['recommendations', sessionId, query] as const,
  searchMaterials: (query: string) => ['materials-search', query] as const,
  artifacts: (sessionId: string) => ['artifacts', sessionId] as const,
};
