# Low Level 4 Local LoRA

## Current status

This repository now validates a **real Low-L4 local fine-tuned runtime path**, but it still does **not** justify a full Level 4 claim.

Validated on 2026-05-15:

- approved `TrainingExample` audit via `scripts/audit-l4-dataset.mjs`
- dev-only synthetic dataset seeding via `scripts/seed-l4-demo-training-data.mjs`
- **curated v2 dataset** seeding via `scripts/seed-l4-curated-training-data.mjs` (100 examples, 10 categories)
- quality audit via `scripts/audit-l4-dataset-quality.mjs`
- Hugging Face chat JSONL export via `scripts/export-l4-dataset.mjs`
- dataset validation via `ml/scripts/validate_dataset.py`
- environment capability check via `ml/scripts/check_l4_environment.py`
- real LoRA adapter training to `ml/adapters/local-lora-tutor-v1`
- real FastAPI serving mode from `ml/scripts/serve_local_lora.py`
- model registry activation via `node scripts/register-local-lora-model.mjs --real`
- browser smoke:
  - `learning_engine_l3` -> active ready `local_lora`
  - visible `Local LoRA Tutor / L4 Runtime` badge
  - server stop -> fallback to `Internal L3 Tutor`
  - `API AI lớn` still returns Gemini normally
- eval benchmark runs persisted for:
  - `internal_l3_tutor`
  - `local_lora`
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

The current real adapter was trained on a **tiny synthetic dev dataset**:

- dataset: `DEV Synthetic L4 Tutor v1`
- approved examples: `24`
- exported train / validation: `22 / 2`
- training mode: real CPU LoRA fine-tune

Observed benchmark result on 2026-05-15:

- `internal_l3_tutor` average score: `0.31`
- `local_lora` average score: `0.03`
- `GEMINI` average score: `0.32`

The `local_lora` run is real but weak:

- browser smoke succeeded on a clean fresh session
- longer prompts still hit `LOCAL_LORA_TIMEOUT after 30000ms` in several eval cases
- this is a valid runtime milestone, not a model-quality milestone

## Curated v2 dataset

The `DEV Curated L4 Tutor v2` dataset provides 100 approved, quality-audited examples:

- 10 categories: explain_concept, give_example, compare_concepts, correct_student_answer, generate_quiz, generate_flashcards, summarize_lesson, study_plan, source_grounded_answer, fallback_transparency
- 10 examples per category
- All Vietnamese tutor style
- No fake citations or hallucinated sources
- Quality-audited: no duplicates, no empty fields, Vietnamese presence verified
- Synthetic/dev-safe metadata: `source=synthetic-curated-dev`, `version=v2`

This improves the training basis but still requires retraining the adapter on a GPU to evaluate real quality improvement.

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
python ml/scripts/check_l4_environment.py
```

7. Train:

```bash
python ml/scripts/train_lora_sft.py --config ml/configs/l4-low-sft.yaml --dataset ml/datasets/local-lora-tutor-v2/train.jsonl --validation ml/datasets/local-lora-tutor-v2/val.jsonl
```

8. Serve:

```bash
python ml/scripts/serve_local_lora.py
```

9. Register the real adapter:

```bash
node scripts/register-local-lora-model.mjs --real
```

## Safety

- Do not commit `.env`, API keys, exported JSONL with user content, adapter checkpoints, or model weights.
- Keep `Internal L3 Tutor` as the safe default fallback.
- Treat synthetic-only training as pipeline validation, not product-quality evidence.
- The curated v2 dataset is dev-safe and may be committed, but exported JSONL artifacts under `ml/datasets/` are gitignored.
