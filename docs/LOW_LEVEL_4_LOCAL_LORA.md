# Low Level 4 Local LoRA

## Current Status

This repository now validates a real Local LoRA v4 retraining and runtime path on laptop GPU hardware, but it still does not justify a full Level 4 or production-grade local AI claim.

Validated on 2026-05-17:

- failure analysis script added for recent eval runs and local-vs-internal comparison
- stronger Phase 9 eval suite seeded at 30 synthetic Vietnamese tutor cases across 10 categories
- targeted `DEV Targeted L4 Tutor v4` dataset seeded into Postgres
- v4 dataset quality audit passed at 180 approved examples with 10 categories x 18 each
- HF chat JSONL export passed at 162 train / 18 validation examples
- JSONL validation passed for both splits
- real LoRA v4 retraining completed to `ml/adapters/local-lora-tutor-v4`
- real FastAPI serving mode ran with `mode=real`, `adapterLoaded=true`, `modelLoaded=true`, `device=cuda`
- real model registry activation set `local-lora-tutor-v4` active for `local_lora`
- browser smoke passed for:
  - `learning_engine_l3` -> `Local LoRA Tutor / L4 Runtime / local-lora-tutor-v4`
  - local server stop -> fallback to `AI học tập Level 3 / L3 Tutor Model`
  - `API AI lớn` -> external provider badge when configured, with honest quota/fallback warnings when provider quota was exhausted

## What Is Still Not Claimed

This repo still does not claim:

- trained-from-scratch model development
- production-grade local throughput
- production-grade local quality
- a full Level 4 milestone

## Dataset Evolution

| Dataset | Examples | Status |
| --- | --- | --- |
| `DEV Synthetic L4 Tutor v1` | 24 | Original pipeline validation dataset |
| `DEV Curated L4 Tutor v2` | 100 | Curated synthetic/dev-safe, 10 categories x 10 |
| `DEV Curated L4 Tutor v3` | 300 | Curated synthetic/dev-safe, 10 categories x 30 |
| `DEV Targeted L4 Tutor v4` | 180 | Targeted synthetic/dev-safe, focused on observed failure modes instead of blind volume growth |

The v4 dataset is Vietnamese, concise, synthetic/dev-safe, and tuned toward actual local failure modes such as missed tasks, wrong format, weak examples, missing practice questions, and weak source-grounded behavior. Exported JSONL remains ignored and must not be committed.

## Failure Analysis Summary

Observed from the latest local v3 failure analysis on 2026-05-17:

- weakest categories: `explain_concept`, `source_grounded_answer`, `generate_flashcards`, `study_plan`, `summarize_lesson`
- top failure modes: `missed_task`, `no_practice_question`, `too_generic`, `wrong_format`, `language_mismatch`
- local-specific issues: prompts were still too broad for a small adapter, some outputs skipped the expected example/practice-question pattern, and long context increased latency without improving answers

Implemented Phase 9 fixes:

- shorter local-only system prompt
- task-specific output templates for all 10 tutor categories
- tighter context trimming with `LOCAL_LORA_CONTEXT_MAX_CHARS`
- explicit local generation config pass-through
- `repetition_penalty=1.05` added on the local server

## Benchmark Reality

Historical comparison:

- `local_lora v1` average score: `0.03`
- `local_lora v2` average score: `0.21`
- `local_lora v2` average latency: about `24582 ms`
- `local_lora v3` Phase 8 average score: `0.21`
- `local_lora v3` Phase 8 average latency: `7533 ms`

Observed Phase 9 benchmark result on the stronger 30-case suite seeded with `Phase 9 - ` on 2026-05-17:

- `internal_l3_tutor` average score: `0.32`
- `local_lora v3` average score: `0.07`
- `local_lora v3` average latency: `7611 ms`
- `local_lora v3` p50 latency: `7495 ms`
- `local_lora v3` p95 latency: `8603 ms`
- `local_lora v4` average score: `0.06`
- `local_lora v4` average latency: `7355 ms`
- `local_lora v4` p50 latency: `7462 ms`
- `local_lora v4` p95 latency: `8105 ms`
- `local_lora v4` timeout count: `0`
- `local_lora v4` fallback count: `0`
- `local_lora v4` error count: `0`

What this means:

- latency stayed slightly better in v4 than v3 on the stronger suite
- timeout stability remained intact
- quality did not improve; v4 regressed from `0.07` to `0.06` on the stronger suite
- `internal_l3_tutor` still clearly outperforms the local adapter on quality

Phase 9 is therefore a targeted debugging and runtime-hardening cycle, not a stronger local-quality milestone.

## Real Workflow

1. Seed the targeted dataset:

```powershell
node scripts/seed-l4-curated-training-data.mjs --version v4 --dry-run
node scripts/seed-l4-curated-training-data.mjs --version v4
```

2. Audit quality:

```powershell
node scripts/audit-l4-dataset-quality.mjs --version v4
```

3. Export the HF chat JSONL split:

```powershell
node scripts/export-l4-dataset.mjs `
  --dataset-id <DEV_TARGETED_L4_TUTOR_V4_DATASET_ID> `
  --out ml/datasets/local-lora-tutor-v4/train.jsonl `
  --validation-out ml/datasets/local-lora-tutor-v4/val.jsonl `
  --validation-ratio 0.1
```

4. Validate both files:

```powershell
.\.venv-l4\Scripts\python.exe ml/scripts/validate_dataset.py ml/datasets/local-lora-tutor-v4/train.jsonl
.\.venv-l4\Scripts\python.exe ml/scripts/validate_dataset.py ml/datasets/local-lora-tutor-v4/val.jsonl
```

5. Train the real adapter:

```powershell
.\.venv-l4\Scripts\python.exe ml/scripts/train_lora_sft.py `
  --config ml/configs/l4-low-sft.yaml `
  --dataset ml/datasets/local-lora-tutor-v4/train.jsonl `
  --validation ml/datasets/local-lora-tutor-v4/val.jsonl `
  --output ml/adapters/local-lora-tutor-v4 `
  --dataset-name "DEV Targeted L4 Tutor v4" `
  --dataset-id <DEV_TARGETED_L4_TUTOR_V4_DATASET_ID>
```

6. Serve the real adapter:

```powershell
.\.venv-l4\Scripts\python.exe ml/scripts/serve_local_lora.py --adapter ml/adapters/local-lora-tutor-v4 --model local-lora-tutor-v4
```

7. Register the real adapter:

```powershell
node scripts/register-local-lora-model.mjs --real --model local-lora-tutor-v4 --adapter ml/adapters/local-lora-tutor-v4
```

## Safety

- Do not commit `.env`, API keys, exported JSONL, adapters, weights, or generated outputs.
- Keep `Internal L3 Tutor` as the safe fallback.
- Keep `External API mode` available; do not remove Gemini/OpenAI support.
- Do not claim production-grade local inference or a full Level 4 milestone from the current numbers.
- Safe CV wording after this phase:
  - `Improved the Local LoRA pipeline through targeted eval-failure analysis, prompt-shape tuning, and retraining a focused Vietnamese tutor adapter, with CUDA serving, fallback validation, and transparent benchmark reporting.`
