# Chatbot AI - Vietnamese AI Study Assistant

A production-minded fullstack AI learning workspace for Vietnamese students, featuring realtime chat, study artifacts, contextual learning support, AI provider diagnostics, an internal AI Level 3 learning engine, and a Low Level 4 Local LoRA runtime that has now completed a targeted Phase 9 retraining cycle.

This is not a basic API-wrapper chatbot. The project includes a dataset manager, evaluation harness, model registry, fine-tune-ready adapter layer, internal tutor runtime, and a real local LoRA integration path with honest quality and latency reporting.

## Highlights

- Fullstack AI study assistant built with React, TypeScript, Express, PostgreSQL, Prisma, Socket.IO, and TanStack Query
- Realtime chat with optimistic UI, reconnect handling, retry flow, HTTP fallback, and provider metadata
- Study artifact system with summaries, flashcards, quizzes, notes, editing, refinement, review mode, favorites, sharing, and cross-session search
- AI Level 3 architecture with dataset manager, evaluation harness, model registry, fine-tune-ready adapter layer, and internal tutor runtime
- Low Level 4 local model path with HF chat export, LoRA/SFT training scripts, mock/real local inference server, `LocalLoraProvider`, and model registry activation flow
- Production-minded validation with Prisma migrations, lint, typecheck, unit/component tests, Playwright E2E, build checks, and AI runtime diagnostics

## Project Status

| Area | Status |
| --- | --- |
| Fullstack app | Complete |
| Realtime chat + HTTP fallback | Complete |
| Study artifacts | Complete |
| AI Level 3 learning engine | Complete |
| Internal L3 tutor runtime | Complete |
| Dataset manager | Complete |
| Evaluation harness | Complete |
| Model registry | Complete |
| Fine-tune-ready adapter layer | Complete |
| Low Level 4 Local LoRA integration | Real v4 runtime validated on targeted dev-safe tutor data |
| Real trained LoRA adapter | Retrained locally through v4, still not a full Level 4 or production-quality claim |
| Production deployment | Not finalized |

## AI Runtime Layers

The project supports multiple AI runtime paths:

- `API AI lớn`: backend-routed Gemini/OpenAI providers
- `AI học tập Level 3`: internal tutor runtime with optional Local LoRA activation
- `Internal L3 Tutor`: safe fallback when the Local LoRA path is unavailable or unsuitable

The frontend never calls Gemini/OpenAI directly. All AI calls go through the backend routing layer.

## Local LoRA Reality

Implemented Local LoRA pieces:

- `ml/` workspace for HF dataset export, validation, training, and serving
- mock/real FastAPI local inference server
- backend `LocalLoraProvider`
- model registry integration
- model gateway routing
- fallback from Local LoRA to Internal L3 Tutor

Current benchmark reality:

- historical `local_lora v1` score: `0.03`
- historical `local_lora v2` score: `0.21`
- Phase 8 `local_lora v3` score on the older suite: `0.21`
- Phase 9 `local_lora v3` score on the stronger suite: `0.07`
- Phase 9 `local_lora v4` score on the stronger suite: `0.06`
- Phase 9 `internal_l3_tutor` score on the stronger suite: `0.32`
- Phase 9 `local_lora v4` average latency: `7355 ms`
- Phase 9 `local_lora v4` timeout count: `0`

This means the local runtime path is real and stable, but it still does not justify a full Level 4 or production-grade quality claim.

## Repository Structure

```txt
apps/
  api/
  web/
packages/
  shared/
prisma/
ml/
docs/
scripts/
tests/
infra/
```

## Environment Requirements

Required:

- Node.js 22+
- pnpm 10+
- PostgreSQL
- Python 3.10+ for Local LoRA scripts

Optional:

- Docker Desktop
- Gemini API key
- OpenAI API key
- GPU or cloud notebook for real LoRA training

## Local Setup

Install dependencies:

```powershell
pnpm install
```

Copy environment files:

```powershell
Copy-Item ".env.example" ".env" -ErrorAction SilentlyContinue
Copy-Item "apps\api\.env.example" "apps\api\.env" -ErrorAction SilentlyContinue
Copy-Item "apps\web\.env.example" "apps\web\.env" -ErrorAction SilentlyContinue
```

Generate Prisma client:

```powershell
pnpm exec prisma generate --schema prisma/schema.prisma
```

Apply migrations:

```powershell
pnpm exec prisma migrate deploy --schema prisma/schema.prisma
```

Do not use `prisma db push` for normal development.

## AI Runtime Config

Default Level 3 config:

```env
L3_ALLOW_EXTERNAL_FALLBACK=false
L3_INTERNAL_MODEL_NAME=internal-l3-tutor-v1
```

Local LoRA config:

```env
LOCAL_LORA_ENABLED=true
LOCAL_LORA_BASE_URL=http://localhost:8008
LOCAL_LORA_MODEL=local-lora-tutor-v4
LOCAL_LORA_TIMEOUT_MS=30000
LOCAL_LORA_MAX_NEW_TOKENS=64
LOCAL_LORA_TEMPERATURE=0.2
LOCAL_LORA_TOP_P=0.9
LOCAL_LORA_CONTEXT_MAX_CHARS=6000
```

Check provider and runtime readiness:

```powershell
pnpm ai:doctor
```

## Run The Stack

```powershell
pnpm dev:api
pnpm dev:web
```

Typical local URLs:

- API: [http://localhost:4000](http://localhost:4000)
- Web: [http://localhost:5173](http://localhost:5173)

## Local LoRA Workflow

Seed targeted v4 data:

```powershell
node scripts/seed-l4-curated-training-data.mjs --version v4
```

Audit quality:

```powershell
node scripts/audit-l4-dataset-quality.mjs --version v4
```

Export:

```powershell
node scripts/export-l4-dataset.mjs `
  --dataset-id <DEV_TARGETED_L4_TUTOR_V4_DATASET_ID> `
  --out ml/datasets/local-lora-tutor-v4/train.jsonl `
  --validation-out ml/datasets/local-lora-tutor-v4/val.jsonl `
  --validation-ratio 0.1
```

Train:

```powershell
.\.venv-l4\Scripts\python.exe ml/scripts/train_lora_sft.py `
  --config ml/configs/l4-low-sft.yaml `
  --dataset ml/datasets/local-lora-tutor-v4/train.jsonl `
  --validation ml/datasets/local-lora-tutor-v4/val.jsonl `
  --output ml/adapters/local-lora-tutor-v4 `
  --dataset-name "DEV Targeted L4 Tutor v4" `
  --dataset-id <DEV_TARGETED_L4_TUTOR_V4_DATASET_ID>
```

Serve:

```powershell
.\.venv-l4\Scripts\python.exe ml/scripts/serve_local_lora.py --adapter ml/adapters/local-lora-tutor-v4 --model local-lora-tutor-v4
```

Register:

```powershell
node scripts/register-local-lora-model.mjs --real --model local-lora-tutor-v4 --adapter ml/adapters/local-lora-tutor-v4
```

## Validation

```powershell
pnpm exec prisma validate --schema prisma/schema.prisma
pnpm exec prisma migrate status --schema prisma/schema.prisma
pnpm exec prisma migrate deploy --schema prisma/schema.prisma
pnpm exec prisma generate --schema prisma/schema.prisma

pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm ai:doctor
```

Python validation:

```powershell
.\.venv-l4\Scripts\python.exe -m py_compile ml/scripts/train_lora_sft.py
.\.venv-l4\Scripts\python.exe -m py_compile ml/scripts/serve_local_lora.py
.\.venv-l4\Scripts\python.exe -m py_compile ml/scripts/validate_dataset.py
.\.venv-l4\Scripts\python.exe -m py_compile ml/scripts/check_l4_environment.py
.\.venv-l4\Scripts\python.exe -m unittest discover ml/tests
```

## Safety

- Do not commit `.env`, API keys, exported JSONL, adapters, weights, or generated outputs
- Keep `Internal L3 Tutor` fallback intact
- Keep `API AI lớn` / external provider mode intact
- Do not claim trained-from-scratch model development
- Do not claim production-grade local AI quality
- Do not claim a full Level 4 milestone from the current results

Safe CV wording after Phase 9:

`Improved the Local LoRA pipeline through targeted eval-failure analysis, prompt-shape tuning, and retraining a focused Vietnamese tutor adapter, with CUDA serving, fallback validation, and transparent benchmark reporting.`

## License

Personal educational / portfolio project.
