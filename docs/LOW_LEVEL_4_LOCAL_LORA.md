# Low Level 4 Local LoRA

## Scope

This repository includes a **Low Level 4-ready Local LoRA integration**, not a claimed full Level 4 runtime.

What is validated today:

- `local_lora` exists as a backend provider behind `ModelGatewayService`
- `learning_engine_l3` can route to an active `local_lora` model version first
- Local LoRA failure falls back to `internal_l3_tutor`
- External fallback from L3 remains opt-in via `L3_ALLOW_EXTERNAL_FALLBACK=true`
- Dataset export, python dataset validation, and mock/local inference scripts have deterministic automated coverage

What is **not** claimed today:

- a real trained adapter checkpoint
- production-grade local model serving throughput
- a fully validated Level 4 browser/demo flow with trained weights

## Deterministic validation

Automated coverage now includes:

- `apps/api/test/local-lora.provider.test.ts`
- `apps/api/test/model-gateway.service.test.ts`
- `apps/api/test/ai-runtime-router.test.ts`
- `apps/api/test/export-l4-dataset.test.ts`
- `apps/api/test/fine-tune-adapters.test.ts`
- `ml/tests/test_validate_dataset.py`

These tests do **not** call Gemini/OpenAI and do **not** load a real local LLM.

## Real Local LoRA workflow

1. Curate and approve examples in AI Lab.
2. Export a dataset:

```bash
node scripts/export-l4-dataset.mjs --dataset-id <id> --out ml/datasets/train.jsonl --validation-out ml/datasets/val.jsonl --allow-small
```

3. Validate the JSONL:

```bash
python ml/scripts/validate_dataset.py ml/datasets/train.jsonl
```

4. Train a local adapter when a real ML environment is available:

```bash
python ml/scripts/train_lora_sft.py --config ml/configs/l4-low-sft.yaml --dataset ml/datasets/train.jsonl --validation ml/datasets/val.jsonl
```

5. Serve the local inference endpoint:

```bash
python ml/scripts/serve_local_lora.py --mock
```

6. Activate a ready `local_lora` model version in AI Lab / model registry.
7. Run browser smoke and confirm the provider badge shows `Local LoRA Tutor`.

## Safety

- Do not commit `.env`, API keys, datasets with real user content, adapter checkpoints, model weights, or generated outputs.
- Keep `Internal L3 Tutor` enabled as the safe fallback path until a real Local LoRA adapter is trained and validated.
