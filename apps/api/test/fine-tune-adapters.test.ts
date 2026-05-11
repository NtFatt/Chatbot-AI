import { describe, expect, it } from 'vitest';

import { LocalLoraFineTuneAdapterStub } from '../src/integrations/ai/fine-tune/local-lora-fine-tune.adapter';
import { OpenAIFineTuneAdapter } from '../src/integrations/ai/fine-tune/openai-fine-tune.adapter';

const adapterInput = {
  jobId: 'job-1',
  dataset: {
    id: 'dataset-1',
    name: 'Dataset 1',
    description: null,
    status: 'active' as const,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  approvedExamples: [
    {
      id: 'example-1',
      datasetId: 'dataset-1',
      sourceType: 'manual' as const,
      sourceId: null,
      subject: 'SQL',
      topic: null,
      learningMode: null,
      userLevel: null,
      inputMessages: [{ role: 'user' as const, content: 'Explain joins' }],
      idealResponse: 'A join combines rows from multiple tables.',
      qualityScore: 4,
      status: 'approved' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  baseModel: 'gpt-5.4-mini',
  exports: {
    openaiJsonl: '{"messages":[]}',
    hfChat: '[{"messages":[]}]',
  },
};

describe('Fine-tune adapters', () => {
  it('returns scaffold metadata for the OpenAI adapter', async () => {
    const result = await new OpenAIFineTuneAdapter().startJob(adapterInput);

    expect(result.status).toBe('queued');
    expect(result.metadata?.adapter).toBe('openai-fine-tune-skeleton');
  });

  it('returns local training instructions for the LoRA stub adapter', async () => {
    const result = await new LocalLoraFineTuneAdapterStub().startJob(adapterInput);

    expect(result.status).toBe('queued');
    expect(result.metadata?.adapter).toBe('local-lora-stub');
    expect(String(result.metadata?.command)).toContain('train_lora.py');
  });
});
