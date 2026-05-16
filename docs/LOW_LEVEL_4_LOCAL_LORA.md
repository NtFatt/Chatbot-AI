# Low Level 4 Local LoRA

## Current status

This repository now validates a **real Local LoRA v3 retraining and runtime path** on laptop GPU hardware, but it still does **not** justify a full Level 4 or production-grade local AI claim.

Validated on 2026-05-17:

- curated `DEV Curated L4 Tutor v3` dataset seeded into Postgres
- dataset quality audit passed at `300` approved examples with `10` categories × `30` each
- HF chat JSONL export passed at `270` train / `30` validation examples
- JSONL validation passed for both splits
- real LoRA retraining completed to `ml/adapters/local-lora-tutor-v3`
- real FastAPI serving mode ran with `mode=real`, `adapterLoaded=true`, `modelLoaded=true`, `device=cuda`
- real model registry activation set `local-lora-tutor-v3` active for `local_lora`
- browser smoke passed for:
  - `learning_engine_l3` → `Local LoRA Tutor / L4 Runtime / local-lora-tutor-v3`
  - local server stop → fallback to `AI học tập Level 3 / L3 Tutor Model`
  - `API AI lớn` → external provider badge (`GEMINI / gemini-2.5-flash`) when configured
- persisted Phase 8 benchmark runs for:
  - `internal_l3_tutor`
  - `local_lora v3`
  - configured external providers

## What is still not claimed

This repo still does **not** claim:

- trained-from-scratch model development
- production-grade local throughput
- production-grade local quality
- a full Level 4 milestone

## Dataset evolution

| Dataset | Examples | Status |
| --- | --- | --- |
| `DEV Synthetic L4 Tutor v1` | 24 | Original pipeline validation dataset |
| `DEV Curated L4 Tutor v2` | 100 | Curated synthetic/dev-safe, 10 categories × 10 |
| `DEV Curated L4 Tutor v3` | 300 | Curated synthetic/dev-safe, 10 categories × 30, quality-audited |

The v3 dataset is Vietnamese, concise, synthetic/dev-safe, and intended as a stronger retraining base for the local tutor path. Exported JSONL remains ignored and must not be committed.

## Benchmark reality

Historical comparison:

- `local_lora v1` average score: `0.03`
- `local_lora v2` average score: `0.21`
- `local_lora v2` average latency: about `24582 ms`

Observed Phase 8 benchmark result on 2026-05-17:

- `internal_l3_tutor` average score: `0.59`
- `local_lora v3` average score: `0.21`
- `local_lora v3` average latency: `7533 ms`
- `local_lora v3` p50 latency: `7488 ms`
- `local_lora v3` p95 latency: `7821 ms`
- `local_lora v3` timeout count: `0`
- `local_lora v3` error count: `0`

What this means:

- latency improved materially versus v2
- timeout stability improved materially versus the earlier parallel-eval failure mode
- quality did **not** beat the historical v2 benchmark; it matched `0.21`
- `internal_l3_tutor` still outperforms the local adapter on quality by a wide margin

## Real workflow

1. Seed the curated dataset:

```powershell
node scripts/seed-l4-curated-training-data.mjs --version v3 --dry-run
node scripts/seed-l4-curated-training-data.mjs --version v3
```

2. Audit quality:

```powershell
node scripts/audit-l4-dataset-quality.mjs --version v3
```

3. Export the HF chat JSONL split:

```powershell
node scripts/export-l4-dataset.mjs `
  --dataset-id <DEV_CURATED_L4_TUTOR_V3_DATASET_ID> `
  --out ml/datasets/local-lora-tutor-v3/train.jsonl `
  --validation-out ml/datasets/local-lora-tutor-v3/val.jsonl `
  --validation-ratio 0.1
```

4. Validate both files:

```powershell
.\.venv-l4\Scripts\python.exe ml/scripts/validate_dataset.py ml/datasets/local-lora-tutor-v3/train.jsonl
.\.venv-l4\Scripts\python.exe ml/scripts/validate_dataset.py ml/datasets/local-lora-tutor-v3/val.jsonl
```

5. Train the real adapter:

```powershell
.\.venv-l4\Scripts\python.exe ml/scripts/train_lora_sft.py `
  --config ml/configs/l4-low-sft.yaml `
  --dataset ml/datasets/local-lora-tutor-v3/train.jsonl `
  --validation ml/datasets/local-lora-tutor-v3/val.jsonl `
  --output ml/adapters/local-lora-tutor-v3 `
  --dataset-name "DEV Curated L4 Tutor v3" `
  --dataset-id <DEV_CURATED_L4_TUTOR_V3_DATASET_ID>
```

6. Serve the real adapter:

```powershell
.\.venv-l4\Scripts\python.exe ml/scripts/serve_local_lora.py --adapter ml/adapters/local-lora-tutor-v3 --model local-lora-tutor-v3
```

7. Register the real adapter:

```powershell
node scripts/register-local-lora-model.mjs --real --model local-lora-tutor-v3 --adapter ml/adapters/local-lora-tutor-v3
```

## Safety

- Do not commit `.env`, API keys, exported JSONL, adapters, weights, or generated outputs.
- Keep `Internal L3 Tutor` as the safe fallback.
- Keep `External API mode` available; do not remove Gemini/OpenAI support.
- Do not claim production-grade local inference or a full Level 4 milestone from the current numbers.
- Safe CV wording after this phase:
  - `Expanded the Local LoRA training pipeline to a 300-example curated Vietnamese tutor dataset and benchmarked a retrained local adapter with CUDA serving, registry activation, fallback handling, and transparent quality/latency reporting.`
