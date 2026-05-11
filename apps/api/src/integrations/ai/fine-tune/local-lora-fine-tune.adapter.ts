import type { FineTuneAdapter, FineTuneAdapterResult, FineTuneAdapterStartInput } from './fine-tune-adapter';

const countJsonLines = (content: string) =>
  content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length;

export class LocalLoraFineTuneAdapterStub implements FineTuneAdapter {
  readonly provider = 'local_lora' as const;

  async startJob(input: FineTuneAdapterStartInput): Promise<FineTuneAdapterResult> {
    const outputDir = `./artifacts/fine-tune/${input.dataset.id}`;
    const command = [
      'python train_lora.py',
      `--dataset ${outputDir}/dataset.hf-chat.json`,
      `--base-model ${input.baseModel}`,
      `--output-dir ${outputDir}/model`,
    ].join(' ');

    return {
      status: 'queued',
      externalJobId: null,
      metadata: {
        adapter: 'local-lora-stub',
        exportFormat: 'hf_chat',
        outputDir,
        command,
        instructions: [
          'Export the HF chat payload to a local training workspace.',
          'Run the generated command in your local fine-tuning environment.',
          'After training, update the resulting model version with the produced checkpoint name.',
        ],
        approvedExampleCount: input.approvedExamples.length,
        hfChatExamples: countJsonLines(input.exports.hfChat),
        preview: input.exports.hfChat.slice(0, 600),
      },
      modelVersion: {
        name: `Local LoRA ${input.dataset.name} v${input.dataset.version}`,
        provider: 'local_lora',
        baseModel: input.baseModel,
        fineTunedModel: null,
        status: 'training',
        metadata: {
          adapter: 'local-lora-stub',
          datasetId: input.dataset.id,
          command,
        },
      },
    };
  }
}
