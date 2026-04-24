import type { ProviderKey } from './providers';

export interface ProviderCapabilityDescriptor {
  streaming: boolean;
  toolCalling: boolean;
  fileSearch: boolean;
  structuredOutput: boolean;
  reasoningLevel: 'fast' | 'balanced' | 'deep';
}

export const PROVIDER_CAPABILITIES: Record<ProviderKey, ProviderCapabilityDescriptor> = {
  GEMINI: {
    streaming: true,
    toolCalling: false,
    fileSearch: false,
    structuredOutput: false,
    reasoningLevel: 'balanced',
  },
  OPENAI: {
    streaming: true,
    toolCalling: false,
    fileSearch: false,
    structuredOutput: false,
    reasoningLevel: 'deep',
  },
};
