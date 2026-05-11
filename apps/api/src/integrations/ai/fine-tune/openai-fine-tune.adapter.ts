import type { FineTuneAdapter, FineTuneAdapterResult, FineTuneAdapterStartInput } from './fine-tune-adapter';

export class OpenAIFineTuneAdapter implements FineTuneAdapter {
  readonly provider = 'fine_tuned_openai' as const;

  async startJob(input: FineTuneAdapterStartInput): Promise<FineTuneAdapterResult> {
    return {
      status: 'queued',
      externalJobId: null,
      metadata: {
        adapter: 'openai-fine-tune-skeleton',
        note: 'OpenAI fine-tuning flow is scaffolded but not yet connected to the live vendor API.',
        datasetId: input.dataset.id,
        approvedExampleCount: input.approvedExamples.length,
        expectedExport: 'openai_jsonl',
      },
      modelVersion: {
        name: `OpenAI FT ${input.dataset.name} v${input.dataset.version}`,
        provider: 'fine_tuned_openai',
        baseModel: input.baseModel,
        fineTunedModel: null,
        status: 'training',
        metadata: {
          adapter: 'openai-fine-tune-skeleton',
          datasetId: input.dataset.id,
        },
      },
    };
  }
}
