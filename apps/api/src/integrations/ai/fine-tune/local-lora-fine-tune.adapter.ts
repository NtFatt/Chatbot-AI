import type { FineTuneAdapter, FineTuneAdapterResult, FineTuneAdapterStartInput } from './fine-tune-adapter';

const countJsonLines = (content: string) =>
  content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length;

export class LocalLoraFineTuneAdapterStub implements FineTuneAdapter {
  readonly provider = 'local_lora' as const;

  async startJob(input: FineTuneAdapterStartInput): Promise<FineTuneAdapterResult> {
    const outputDir = `./ml/adapters/${input.dataset.id}`;
    const command = [
      'python ml/scripts/train_lora_sft.py',
      '--config ml/configs/l4-low-sft.yaml',
      `--dataset ${outputDir}/train.jsonl`,
      `--validation ${outputDir}/validation.jsonl`,
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
          'Export the HF chat payload to a local training workspace as train/validation JSONL.',
          'Run the generated command in your local fine-tuning environment after reviewing the base model and config.',
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
