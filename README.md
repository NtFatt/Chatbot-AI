# Chatbot AI — Vietnamese Study Assistant

A production-minded fullstack AI study workspace for Vietnamese students.

The app provides realtime chat, study artifacts, contextual learning materials, AI provider diagnostics, an internal Level 3 learning engine, and a Low Level 4-ready Local LoRA runtime.

---

## 1. Overview

**Chatbot AI** is an AI-powered study assistant designed for students who need clear explanations, reusable study materials, and a reliable learning workspace.

Core goals:

- Ask academic questions in a realtime chat interface.
- Save generated answers as summaries, flashcards, quizzes, and notes.
- Review learning artifacts later.
- Search across old sessions and study artifacts.
- Switch between external AI providers and the app-owned learning engine.
- Prepare a real local fine-tuned model path through Local LoRA.

This project is built as a professional CV/demo project with production-oriented architecture, tests, migrations, diagnostics, and clear runtime documentation.

---

## 2. Current Status

| Area | Status |
| --- | --- |
| Fullstack app | Complete |
| Realtime chat + HTTP fallback | Complete |
| Study artifacts | Complete |
| Artifact refinement / quiz review | Complete |
| Global search / artifact search | Complete |
| AI Level 3 learning engine | Complete |
| Internal L3 tutor runtime | Complete |
| Dataset manager | Complete |
| Evaluation harness | Complete |
| Model registry | Complete |
| Fine-tune-ready adapter layer | Complete |
| Low Level 4 Local LoRA integration | Scaffolded / integration-ready |
| Real trained LoRA adapter | Not committed / must be trained locally |
| Production release | Not release-ready |

---

## 3. Main Features

### Study Workspace

- Guest login
- Session CRUD
- Session pin/archive
- Batch session actions
- Global message search
- Continue-learning entry points
- Responsive dashboard
- Dark mode
- Reconnect / fallback messaging

### Chat System

- Realtime chat through Socket.IO
- HTTP fallback when realtime transport is unavailable
- Optimistic message rendering
- Message retry
- Provider metadata
- Latency / confidence / fallback indicators
- Markdown rendering with sanitized output

### Study Artifacts

Supported artifact types:

- Summary
- Flashcard set
- Quiz set
- Note

Artifact capabilities:

- Generate from AI responses
- Edit artifact content
- Refine artifact content
- Quiz review mode
- Review history
- Favorite artifacts
- Search artifacts across sessions
- Export/share artifacts

### Learning Materials

- Contextual material recommendation
- Subject/topic-based ranking
- Recent source visibility
- Retrieval snapshot per message
- Material source cards

---

## 4. AI Runtime Modes

The app supports two runtime modes per chat session.

### Mode 1 — External AI API

Uses configured large AI providers through the existing provider orchestration layer.

Typical providers:

- Gemini
- OpenAI

Runtime path:

```txt
ChatService
→ AiRuntimeRouterService
→ AIOrchestratorService
→ Gemini/OpenAI

Use this mode when you want the strongest external provider response.

Mode 2 — AI học tập Level 3

Uses the app-owned Level 3 learning engine.

Default provider:

internal_l3_tutor

Default model name:

internal-l3-tutor-v1

Runtime path:

ChatService
→ AiRuntimeRouterService
→ active ready ModelVersion if available
→ InternalL3TutorModelService
→ local study fallback

Important:

Level 3 does not call Gemini/OpenAI by default.
External fallback is opt-in only through environment config.
Level 3 is not a trained-from-scratch LLM.
Level 3 is an app-owned deterministic tutor runtime with model-registry wiring, tutor policy, retrieval context, and structured study behavior.
5. Low Level 4 Local LoRA Runtime

The project includes a Low Level 4-ready local fine-tuning path.

This includes:

ml/ workspace
dataset export script
LoRA/SFT training script
dataset validation script
mock/real FastAPI local inference server
backend LocalLoraProvider
model registry support
routing through ModelGatewayService
fallback to internal Level 3 tutor

Target runtime path:

Approved TrainingExamples
→ HF chat JSONL export
→ LoRA/SFT training
→ local adapter
→ local inference server
→ LocalLoraProvider
→ ModelGateway
→ ModelRegistry active model
→ ChatService

This is Low Level 4-ready. Do not claim a real trained model unless a real adapter has been trained, served, registered, and validated.

6. Tech Stack
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
Provider adapters for Gemini/OpenAI
Internal L3 runtime
Local LoRA provider integration
ML / Local Model Layer
Python
Hugging Face Transformers
PEFT
TRL
FastAPI
Uvicorn
LoRA/SFT training scaffold
7. Repository Structure
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
8. Environment Requirements

Required:

Node.js 22+
pnpm 10+
PostgreSQL
Docker Desktop, optional but recommended
Python 3.10+ for Local LoRA scripts

Optional:

Gemini API key
OpenAI API key
GPU for real LoRA training
9. Setup

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

10. Real AI Setup

Edit:

apps/api/.env

Add at least one real provider key:

GEMINI_API_KEY=your_real_gemini_key
OPENAI_API_KEY=your_real_openai_key

Recommended local/demo config:

GEMINI_ENABLED=true
OPENAI_ENABLED=true
AI_PRIMARY_PROVIDER=GEMINI
AI_FALLBACK_PROVIDER=OPENAI
AI_LOCAL_FALLBACK_ENABLED=true
AI_STARTUP_STRICT=false

Check readiness:

pnpm ai:doctor

Expected:

Runtime AI mode: real
At least one provider configured
11. AI Level 3 Config

Default config:

L3_ALLOW_EXTERNAL_FALLBACK=false
L3_INTERNAL_MODEL_NAME=internal-l3-tutor-v1

Meaning:

learning_engine_l3 uses the internal tutor by default.
Gemini/OpenAI are not called in L3 mode unless external fallback is explicitly enabled.
External API mode still uses Gemini/OpenAI normally.
12. Low Level 4 Local LoRA Config

Enable Local LoRA provider:

LOCAL_LORA_ENABLED=true
LOCAL_LORA_BASE_URL=http://localhost:8008
LOCAL_LORA_MODEL=local-lora-tutor-v1
LOCAL_LORA_TIMEOUT_MS=30000

Start mock/real local inference server:

python ml/scripts/serve_local_lora.py --mock

or:

python ml/scripts/serve_local_lora.py

Check server health:

Invoke-RestMethod http://localhost:8008/health
13. Run Development Stack

Run API:

pnpm dev:api

Run Web:

pnpm dev:web

Or run full stack if supported:

pnpm dev

Typical local URLs:

API: http://localhost:4000
Web: http://localhost:5173

Health check:

Invoke-RestMethod http://localhost:4000/health
14. Validation Commands

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
15. Manual Smoke Test
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
Confirm badge shows AI học tập Level 3 or L3 Tutor Model.
Confirm it does not show Gemini/OpenAI unless external fallback is explicitly enabled.
Low Level 4 Local LoRA
Start Local LoRA server.
Enable LOCAL_LORA_ENABLED=true.
Register and activate a local_lora model version.
Ask a question in Level 3 mode.
Confirm badge shows Local LoRA Tutor or Low L4 Tutor.
Stop local server.
Ask again.
Confirm fallback to Internal L3 Tutor.
16. Useful API Endpoints
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
17. Testing Philosophy

The project is designed to keep AI behavior testable without relying on live provider availability.

Automated tests should:

Mock external providers.
Avoid real Gemini/OpenAI calls.
Avoid loading real local LLMs.
Keep Local LoRA tests deterministic.
Validate routing, metadata, fallback, and UI behavior.
18. Security Notes
Frontend never calls Gemini/OpenAI directly.
API keys stay in backend environment files only.
JWT access tokens are short-lived.
Refresh tokens are hashed in the database.
Request IDs are logged.
Authorization headers are redacted in logs.
Rate limiting is applied per sensitive route.
User input is validated with Zod.
Markdown output is sanitized on the frontend.
Model weights, adapters, and datasets should not be committed.
19. Known Limitations
Low Level 4 is integration-ready unless a real LoRA adapter is trained and served.
Realtime transport may fall back to HTTP in the normal dev stack.
Direct node apps/api/dist/server.js from repo root is not the standard runtime path.
Production deployment is not finalized.
Local LoRA training requires suitable hardware or a cloud notebook/runtime.
20. Project Value

This project demonstrates:

Fullstack TypeScript architecture
Realtime chat engineering
AI provider orchestration
Study artifact generation and review
RAG-style retrieval context
Dataset manager
Evaluation harness
Model registry
Fine-tune-ready architecture
Internal AI runtime mode
Low Level 4 Local LoRA integration
Production-minded testing and validation
21. License

Personal educational / portfolio project.