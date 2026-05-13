# Chatbot AI — Vietnamese AI Study Assistant

A production-minded fullstack AI learning workspace for Vietnamese students, featuring realtime chat, study artifacts, contextual learning support, AI provider diagnostics, an internal AI Level 3 learning engine, and a Low Level 4-ready Local LoRA runtime.

This is not a basic API-wrapper chatbot. The project includes a complete AI learning platform layer: dataset management, evaluation harness, model registry, fine-tune-ready adapters, internal tutor runtime, and local LoRA integration path.

---

## Highlights

- Fullstack AI study assistant built with **React, TypeScript, Express, PostgreSQL, Prisma, Socket.IO, and TanStack Query**.
- Realtime chat with optimistic UI, reconnect handling, retry flow, HTTP fallback, and provider metadata.
- Study artifact system: summaries, flashcards, quizzes, notes, artifact editing, refinement, review mode, favorites, sharing, and cross-session search.
- AI Level 3 architecture with dataset manager, evaluation harness, model registry, fine-tune-ready adapter layer, and internal tutor runtime.
- Low Level 4-ready local model path with dataset export, LoRA/SFT training scripts, mock/real local inference server, `LocalLoraProvider`, and model registry activation flow.
- Production-minded validation: Prisma migrations, lint, typecheck, unit/component tests, Playwright E2E, build checks, and AI runtime diagnostics.

---

## Project Status

| Area | Status |
| --- | --- |
| Fullstack app | Complete |
| Realtime chat + HTTP fallback | Complete |
| Study artifacts | Complete |
| Artifact refinement / review mode | Complete |
| Global message search | Complete |
| Cross-session artifact search | Complete |
| AI provider diagnostics | Complete |
| AI Level 3 learning engine | Complete |
| Internal L3 tutor runtime | Complete |
| Dataset manager | Complete |
| Evaluation harness | Complete |
| Model registry | Complete |
| Fine-tune-ready adapter layer | Complete |
| Low Level 4 Local LoRA integration | Integration-ready |
| Real trained LoRA adapter | Not committed / must be trained locally |
| Production deployment | Not finalized |

---

## Core Features

### Study Workspace

- Guest login
- Session create / rename / delete
- Pin and archive sessions
- Batch session actions
- Continue-learning entry points
- Global message search
- Responsive dashboard
- Dark mode
- Realtime status and HTTP fallback indicator

### Realtime Chat

- Socket.IO realtime messaging
- Optimistic user messages
- Streaming assistant responses
- Message retry
- Reconnect recovery
- HTTP fallback when socket transport is unavailable
- Provider, model, latency, confidence, and fallback metadata

### Study Artifacts

Supported artifact types:

- Summary
- Flashcard set
- Quiz set
- Note

Artifact capabilities:

- Generate from assistant responses
- Edit artifact content
- Refine generated artifacts
- Review quizzes
- Track review history
- Favorite artifacts
- Search artifacts across sessions
- Share and export artifacts

### Learning Materials

- Contextual material recommendation
- Subject/topic-aware ranking
- Retrieval snapshot per assistant response
- Recent source visibility
- Source cards in the study workspace

---

## AI Architecture

The project supports multiple AI runtime layers.

```txt
User Message
→ ChatService
→ AiRuntimeRouterService
→ Runtime Mode
   ├─ External AI API
   │  └─ AIOrchestratorService → Gemini/OpenAI
   │
   └─ AI học tập Level 3
      ├─ Active ModelVersion through ModelGateway
      ├─ InternalL3TutorModelService
      └─ Local study fallback

The frontend never calls Gemini/OpenAI directly. All AI calls go through the backend routing layer.

AI Runtime Modes

Each chat session can use its own runtime mode.

1. External AI API

Uses configured large AI providers through the backend orchestrator.

Typical providers:

Gemini
OpenAI

Runtime path:

ChatService
→ AiRuntimeRouterService
→ AIOrchestratorService
→ Gemini/OpenAI

This mode is used when the user wants responses from external AI providers.

2. AI học tập Level 3

Uses the app-owned Level 3 learning engine.

Default internal provider:

internal_l3_tutor

Default internal model name:

internal-l3-tutor-v1

Runtime path:

ChatService
→ AiRuntimeRouterService
→ active ready ModelVersion if available
→ InternalL3TutorModelService
→ local study fallback

Important:

Level 3 does not call Gemini/OpenAI by default.
External fallback is opt-in only.
Level 3 is not a trained-from-scratch LLM.
Level 3 is an app-owned tutor runtime built around tutor policy, retrieval context, structured study behavior, and model-registry wiring.
Low Level 4 Local LoRA Runtime

The project includes a Low Level 4-ready local fine-tuning path.

Implemented pieces:

ml/ workspace
Hugging Face chat JSONL dataset export
LoRA/SFT training script
Dataset validation script
Mock/real FastAPI local inference server
Backend LocalLoraProvider
Model registry integration
Model gateway routing
Fallback from Local LoRA to Internal L3 Tutor

Target runtime path:

Approved TrainingExamples
→ HF chat JSONL export
→ LoRA/SFT training
→ local adapter
→ local inference server
→ LocalLoraProvider
→ ModelGateway
→ active ModelVersion
→ ChatService

This is a Low Level 4-ready integration. A real trained model should only be claimed after a real LoRA adapter is trained, served, registered, activated, and validated.

Tech Stack
Frontend
React
Vite
TypeScript
Tailwind CSS
TanStack Query
Zustand
Socket.IO client
Framer Motion
Sonner
React Markdown
Rehype sanitize
Backend
Node.js
Express
TypeScript
Socket.IO
Prisma
PostgreSQL
Zod
JWT auth
Gemini/OpenAI provider adapters
Internal Level 3 tutor runtime
Local LoRA provider integration
ML / Local Model Layer
Python
Hugging Face Transformers
PEFT
TRL
FastAPI
Uvicorn
LoRA/SFT training scaffold
Repository Structure
apps/
  api/
    src/
      config/
      integrations/
        ai/
      middlewares/
      modules/
        auth/
        chat/
        artifacts/
        materials/
        providers/
        training/
        evals/
        model-registry/
      sockets/
      utils/
    test/

  web/
    src/
      app/
      components/
      features/
        auth/
        dashboard/
        ai-lab/
        public/
      hooks/
      services/
      store/
      styles/
      utils/
    test/

packages/
  shared/
    src/
      constants/
      prompts/
      schemas/
      types/

prisma/
  migrations/
  schema.prisma
  seed.ts

ml/
  configs/
  scripts/
  datasets/
  outputs/
  adapters/

docs/
  AI_LEVEL_3_RUNTIME_NOTES.md
  LOW_LEVEL_4_LOCAL_LORA.md
  PROJECT_PROGRESS_CHECKLIST.md
  REAL_AI_SETUP.md
  RUNTIME_RUNBOOK.md

scripts/
tests/
infra/
Environment Requirements

Required:

Node.js 22+
pnpm 10+
PostgreSQL
Python 3.10+ for Local LoRA scripts

Optional:

Docker Desktop
Gemini API key
OpenAI API key
GPU or cloud notebook for real LoRA training
Local Setup

Install dependencies:

pnpm install

Copy environment files:

Copy-Item ".env.example" ".env" -ErrorAction SilentlyContinue
Copy-Item "apps\api\.env.example" "apps\api\.env" -ErrorAction SilentlyContinue
Copy-Item "apps\web\.env.example" "apps\web\.env" -ErrorAction SilentlyContinue

Generate Prisma client:

pnpm exec prisma generate --schema prisma/schema.prisma

Apply migrations:

pnpm exec prisma migrate deploy --schema prisma/schema.prisma

Seed database if needed:

pnpm db:seed

Do not use prisma db push for normal development. Use migrations.

Real AI Setup

Edit:

apps/api/.env

Add at least one provider key:

GEMINI_API_KEY=your_real_gemini_key
OPENAI_API_KEY=your_real_openai_key

Recommended local/demo config:

GEMINI_ENABLED=true
OPENAI_ENABLED=true
AI_PRIMARY_PROVIDER=GEMINI
AI_FALLBACK_PROVIDER=OPENAI
AI_LOCAL_FALLBACK_ENABLED=true
AI_STARTUP_STRICT=false

Check provider readiness:

pnpm ai:doctor

Expected:

Runtime AI mode: real
At least one provider configured
AI Level 3 Config

Default config:

L3_ALLOW_EXTERNAL_FALLBACK=false
L3_INTERNAL_MODEL_NAME=internal-l3-tutor-v1

Meaning:

learning_engine_l3 uses the internal tutor by default.
Gemini/OpenAI are not called in Level 3 mode unless external fallback is explicitly enabled.
External API mode still uses Gemini/OpenAI normally.
Low Level 4 Local LoRA Config

Enable Local LoRA provider:

LOCAL_LORA_ENABLED=true
LOCAL_LORA_BASE_URL=http://localhost:8008
LOCAL_LORA_MODEL=local-lora-tutor-v1
LOCAL_LORA_TIMEOUT_MS=30000

Start the mock/real local inference server:

python ml/scripts/serve_local_lora.py --mock

or:

python ml/scripts/serve_local_lora.py

Check server health:

Invoke-RestMethod http://localhost:8008/health
Run Development Stack

Run API:

pnpm dev:api

Run Web:

pnpm dev:web

Or run the full stack if supported:

pnpm dev

Typical local URLs:

API: http://localhost:4000
Web: http://localhost:5173

Health check:

Invoke-RestMethod http://localhost:4000/health
Validation

Run full validation:

pnpm exec prisma validate --schema prisma/schema.prisma
pnpm exec prisma migrate status --schema prisma/schema.prisma
pnpm exec prisma generate --schema prisma/schema.prisma

pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm ai:doctor

Python script checks:

python -m py_compile ml/scripts/train_lora_sft.py
python -m py_compile ml/scripts/serve_local_lora.py
python -m py_compile ml/scripts/validate_dataset.py
Manual Smoke Test
External API Mode
Start API and Web.
Login as guest.
Create or select a session.
Set mode to API AI lớn.
Ask a study question.
Confirm the response badge shows Gemini/OpenAI.
AI Level 3 Mode
Open Workspace Settings.
Set mode to AI học tập Level 3.
Ask a Vietnamese study question.
Confirm the badge shows AI học tập Level 3 or L3 Tutor Model.
Confirm it does not show Gemini/OpenAI unless external fallback is explicitly enabled.
Low Level 4 Local LoRA
Start the Local LoRA server.
Enable LOCAL_LORA_ENABLED=true.
Register and activate a local_lora model version.
Ask a question in Level 3 mode.
Confirm the badge shows Local LoRA Tutor or Low L4 Tutor.
Stop the local server.
Ask again.
Confirm fallback to Internal L3 Tutor.
Useful API Endpoints
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/chat/sessions
POST   /api/chat/sessions
PATCH  /api/chat/sessions/:id
DELETE /api/chat/sessions/:id
GET    /api/chat/sessions/:id/messages
POST   /api/chat/ask

GET    /api/materials/search
GET    /api/materials/recommend

GET    /api/artifacts
POST   /api/artifacts/generate
PATCH  /api/artifacts/:id/content
PATCH  /api/artifacts/:id/refine
POST   /api/artifacts/:id/review-events
GET    /api/artifacts/:id/review-history

GET    /api/providers
POST   /api/providers/test
GET    /api/providers/metrics
GET    /api/providers/incidents

GET    /health
Security Notes
Frontend never calls Gemini/OpenAI directly.
API keys stay in backend environment files only.
JWT access tokens are short-lived.
Refresh tokens are hashed in the database.
Authorization headers are redacted in logs.
Request IDs are included in logs and error responses.
User input is validated with Zod.
Markdown output is sanitized on the frontend.
Rate limiting is applied to sensitive routes.
Model weights, adapters, datasets, and API keys should not be committed.
Known Limitations
Low Level 4 is integration-ready unless a real LoRA adapter is trained and served.
Realtime transport may fall back to HTTP in the normal dev stack.
Direct node apps/api/dist/server.js from repo root is not the standard runtime path.
Production deployment is not finalized.
Local LoRA training requires suitable hardware or a cloud notebook/runtime.
CV Value

This project demonstrates:

Fullstack TypeScript engineering
Realtime chat architecture
AI provider orchestration
Secure backend-only AI routing
RAG-style retrieval context
Study artifact generation and review
Dataset manager
Evaluation harness
Model registry
Fine-tune-ready AI platform design
Internal AI runtime mode
Low Level 4 Local LoRA integration
Production-minded testing and validation
License

Personal educational / portfolio project.