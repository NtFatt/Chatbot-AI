# Low Level 4 Local LoRA

## Current status

This repository now validates a **real Low-L4 local fine-tuned runtime path**, but it still does **not** justify a full Level 4 claim.

Validated on 2026-05-16:

- approved `TrainingExample` audit via `scripts/audit-l4-dataset.mjs`
- dev-only synthetic dataset seeding via `scripts/seed-l4-demo-training-data.mjs`
- **curated v2 dataset** seeding via `scripts/seed-l4-curated-training-data.mjs` (100 examples, 10 categories)
- quality audit via `scripts/audit-l4-dataset-quality.mjs`
- Hugging Face chat JSONL export via `scripts/export-l4-dataset.mjs`
- dataset validation via `ml/scripts/validate_dataset.py`
- environment capability check via `ml/scripts/check_l4_environment.py`
- real LoRA adapter retraining to `ml/adapters/local-lora-tutor-v2`
- real FastAPI serving mode from `ml/scripts/serve_local_lora.py --adapter ml/adapters/local-lora-tutor-v2 --model local-lora-tutor-v2`
- model registry activation via `node scripts/register-local-lora-model.mjs --real --model local-lora-tutor-v2 --adapter ml/adapters/local-lora-tutor-v2`
- browser smoke:
  - `learning_engine_l3` -> active ready `local_lora`
  - visible `Local LoRA Tutor / L4 Runtime / local-lora-tutor-v2` badge
  - server stop -> fallback to `Internal L3 Tutor`
  - `API AI lớn` still surfaces an external provider badge when configured, but quota exhaustion may still degrade to the local study assistant
- eval benchmark runs persisted for:
  - `internal_l3_tutor`
  - `local_lora v2`
  - `GEMINI`

## Dataset evolution

| Dataset | Examples | Status |
| --- | --- | --- |
| `DEV Synthetic L4 Tutor v1` | 24 | Original pipeline validation dataset |
| `DEV Curated L4 Tutor v2` | 100 | Curated synthetic/dev-safe, 10 categories × 10, quality-audited |

The v2 dataset is a significant improvement over the v1 dataset for training basis, but it is still not production-grade. Next phase requires GPU/cloud retraining and benchmark evaluation.

## What is not claimed

This repo still does **not** claim:

- trained-from-scratch model development
- production-grade local inference throughput
- production-grade model quality
- a full Level 4 milestone

## Quality reality

The old v1 adapter was trained on a **tiny synthetic dev dataset**:

- dataset: `DEV Synthetic L4 Tutor v1`
- approved examples: `24`
- exported train / validation: `22 / 2`
- training mode: real CPU LoRA fine-tune

Historical v1 benchmark result on 2026-05-15:

- `internal_l3_tutor` average score: `0.31`
- `local_lora` average score: `0.03`
- `GEMINI` average score: `0.32`

Observed v2 benchmark result on 2026-05-16 after retraining on the curated v2 dataset and fixing the serving device to CUDA:

- `internal_l3_tutor` average score: `0.50`
- `local_lora v2` average score: `0.21`
- `GEMINI` average score: `0.16` on that run, but the provider was quota-limited and several cases failed

The v2 `local_lora` result is improved but still limited:

- score improved from `0.03` to `0.21`
- timeout count dropped from repeated v1 failures to `0` in the final CUDA-backed v2 benchmark run
- average latency is still high at about `24.6s` across the 8-case Phase 7 benchmark set
- `internal_l3_tutor` still materially outperforms the local adapter on quality and responsiveness
- this is a validated local fine-tuning/runtime milestone, not a production-quality or full Level 4 claim

## Curated v2 dataset

The `DEV Curated L4 Tutor v2` dataset provides 100 approved, quality-audited examples:

- 10 categories: explain_concept, give_example, compare_concepts, correct_student_answer, generate_quiz, generate_flashcards, summarize_lesson, study_plan, source_grounded_answer, fallback_transparency
- 10 examples per category
- All Vietnamese tutor style
- No fake citations or hallucinated sources
- Quality-audited: no duplicates, no empty fields, Vietnamese presence verified
- Synthetic/dev-safe metadata: `source=synthetic-curated-dev`, `version=v2`

This improves the training basis and was used for the v2 retraining run, but the resulting adapter still needs more data and inference optimization before any stronger claim would be responsible.

## Real workflow

1. Audit dataset readiness:

```bash
node scripts/audit-l4-dataset.mjs
```

2. Seed curated v2 dataset:

```bash
node scripts/seed-l4-curated-training-data.mjs --dry-run
node scripts/seed-l4-curated-training-data.mjs
```

3. Quality audit:

```bash
node scripts/audit-l4-dataset-quality.mjs
```

4. Export HF chat JSONL:

```bash
node scripts/export-l4-dataset.mjs --dataset-id <id> --out ml/datasets/local-lora-tutor-v2/train.jsonl --validation-out ml/datasets/local-lora-tutor-v2/val.jsonl --validation-ratio 0.1
```

5. Validate JSONL:

```bash
python ml/scripts/validate_dataset.py ml/datasets/local-lora-tutor-v2/train.jsonl
python ml/scripts/validate_dataset.py ml/datasets/local-lora-tutor-v2/val.jsonl
```

6. Check Python/ML environment:

```bash
.\.venv-l4\Scripts\python.exe ml/scripts/check_l4_environment.py
```

7. Train:

```bash
.\.venv-l4\Scripts\python.exe ml/scripts/train_lora_sft.py --config ml/configs/l4-low-sft.yaml --dataset ml/datasets/local-lora-tutor-v2/train.jsonl --validation ml/datasets/local-lora-tutor-v2/val.jsonl --output ml/adapters/local-lora-tutor-v2 --dataset-name "DEV Curated L4 Tutor v2" --dataset-id <id>
```

8. Serve:

```bash
.\.venv-l4\Scripts\python.exe ml/scripts/serve_local_lora.py --adapter ml/adapters/local-lora-tutor-v2 --model local-lora-tutor-v2
```

9. Register the real adapter:

```bash
node scripts/register-local-lora-model.mjs --real --model local-lora-tutor-v2 --adapter ml/adapters/local-lora-tutor-v2
```

## Safety

- Do not commit `.env`, API keys, exported JSONL with user content, adapter checkpoints, or model weights.
- Keep `Internal L3 Tutor` as the safe default fallback.
- Treat synthetic-only training as pipeline validation, not product-quality evidence.
- The curated v2 dataset is dev-safe and may be committed, but exported JSONL artifacts under `ml/datasets/` are gitignored.
- The final v2 serving path should report `mode=real`, `adapterLoaded=true`, `modelLoaded=true`, and `device=cuda` at `http://localhost:8008/health`.
