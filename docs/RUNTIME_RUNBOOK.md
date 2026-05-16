# AI Runtime Runbook

## Supported boot commands

Use these commands for runtime validation in this workspace:

- `pnpm dev:api`
- `pnpm dev:web`
- `pnpm dev`

`node apps/api/dist/server.js` from the repo root is not the standard validation path here until built-output env loading is standardized.

## Quick reference

| Action | How |
| --- | --- |
| Check current runtime mode | `SELECT id, title, "aiRuntimeMode" FROM chat_sessions WHERE id = '<session-id>';` |
| Force a session to external mode | `UPDATE chat_sessions SET "aiRuntimeMode" = 'external_api' WHERE id = '<session-id>';` |
| Force a session to L3 mode | `UPDATE chat_sessions SET "aiRuntimeMode" = 'learning_engine_l3' WHERE id = '<session-id>';` |
| Check active model versions | `SELECT id, name, provider, "baseModel", "fineTunedModel", status, "isActive" FROM model_versions WHERE "isActive" = true;` |
| Check L3 runtime flags | `pnpm ai:doctor` or `Invoke-RestMethod http://localhost:4000/health` |
| Register the Local LoRA smoke model | `node scripts/register-local-lora-model.mjs` |

## Runtime behavior

1. The user selects a per-session runtime mode in **Workspace Settings → Chế độ AI**.
2. `PATCH /api/chat/sessions/:id` stores `aiRuntimeMode`.
3. `ChatService.ask()` loads that mode and passes it into `AiRuntimeRouterService`.
4. The router executes:
   - `external_api` → `AIOrchestratorService`
   - `learning_engine_l3` → active L3 model override if ready → `InternalL3TutorModelService` → local study fallback
   - external fallback only when `L3_ALLOW_EXTERNAL_FALLBACK=true`

## L3 env flags

```env
L3_ALLOW_EXTERNAL_FALLBACK=false
L3_INTERNAL_MODEL_NAME=internal-l3-tutor-v1
LOCAL_LORA_ENABLED=false
LOCAL_LORA_BASE_URL=http://localhost:8008
LOCAL_LORA_MODEL=local-lora-tutor-v2
LOCAL_LORA_MAX_NEW_TOKENS=64
LOCAL_LORA_TEMPERATURE=0.2
LOCAL_LORA_TOP_P=0.9
```

Default behavior:

- Level 3 does not call Gemini/OpenAI.
- External API mode still does.
- Local fallback stays enabled if the internal tutor path fails.

## Low-L4 Local LoRA path

- `local_lora` is an internal backend provider, not a frontend-direct model call.
- It only runs when a ready active `local_lora` model version is selected in the model registry.
- Usage and incident persistence for `local_lora` require migration `20260515143000_add_local_lora_provider_key`.
- In `learning_engine_l3`, the route is:
  - active ready model override (`local_lora` or other supported runtime)
  - `InternalL3TutorModelService`
  - safe local study fallback
  - optional external fallback only when `L3_ALLOW_EXTERNAL_FALLBACK=true`
- Real Local LoRA validation now exists for the curated v2 dataset:
  - real adapter retrained locally on GPU
  - real FastAPI serving mode with explicit adapter/model selection
  - real browser smoke with Internal L3 fallback
  - persisted eval runs for v2
- This is still **not** a full Level 4 claim because quality is still below `internal_l3_tutor` and average local latency remains high.

## Manual smoke checklist

1. Start `pnpm dev:api` and `pnpm dev:web`.
2. Open the app and sign in as guest.
3. Open a session and confirm the connection banner is hidden during a healthy socket connection.
4. Ask a Vietnamese study question in the current session and confirm the reply appears without an `/api/chat/ask` fallback request.
5. Switch to `AI học tập Level 3` if needed and confirm the assistant badge shows `AI học tập Level 3` or `L3 Tutor Model`, not Gemini/OpenAI.
6. Force a socket disconnect and confirm the connection banner appears plus the next send falls back to `POST /api/chat/ask`.
7. Switch to `API AI lớn`.
8. Ask again and confirm the badge shows the real external provider.
9. Check `GET /health` and confirm:
   - `availableRuntimeModes`
   - `defaultRuntimeMode`
   - `l3InternalModel`
   - `l3InternalModelName`
   - `l3ExternalFallbackAllowed`

## Mock Local LoRA smoke

1. Ensure:
   - `LOCAL_LORA_ENABLED=true`
   - `LOCAL_LORA_BASE_URL=http://localhost:8008`
   - `LOCAL_LORA_MODEL=local-lora-tutor-v1`
   - `L3_ALLOW_EXTERNAL_FALLBACK=false`
2. Start the mock server:

```bash
python ml/scripts/serve_local_lora.py --mock
```

3. Activate the smoke model version:

```bash
node scripts/register-local-lora-model.mjs
```

4. Open a session in `AI học tập Level 3`.
5. Ask a question and confirm the assistant badge shows `Local LoRA Tutor / L4 Runtime`.
6. Stop the mock server and ask again.
7. Confirm the next assistant badge falls back to `AI học tập Level 3 / Internal L3 Tutor`.
8. Switch to `API AI lớn` and confirm Gemini/OpenAI still answer normally.

## Real Local LoRA smoke

1. Ensure:
   - `LOCAL_LORA_ENABLED=true`
   - `LOCAL_LORA_BASE_URL=http://localhost:8008`
   - `LOCAL_LORA_MODEL=local-lora-tutor-v2`
   - `LOCAL_LORA_MAX_NEW_TOKENS=64`
   - `LOCAL_LORA_TEMPERATURE=0.2`
   - `LOCAL_LORA_TOP_P=0.9`
   - `L3_ALLOW_EXTERNAL_FALLBACK=false`
2. Train a real adapter and confirm:
   - `ml/adapters/local-lora-tutor-v2/training-metadata.json`
   - `"isMockTraining": false`
3. Start the real server:

```bash
.\.venv-l4\Scripts\python.exe ml/scripts/serve_local_lora.py --adapter ml/adapters/local-lora-tutor-v2 --model local-lora-tutor-v2
```

4. Check health:

```bash
Invoke-RestMethod http://localhost:8008/health
```

Expected:

- `mode=real`
- `adapterLoaded=true`
- `modelLoaded=true`
- `model=local-lora-tutor-v2`
- `device=cuda`

5. Register the real model:

```bash
node scripts/register-local-lora-model.mjs --real --model local-lora-tutor-v2 --adapter ml/adapters/local-lora-tutor-v2
```

6. Open a fresh session in `AI học tập Level 3`.
7. Ask a short Vietnamese study question.
8. Confirm the assistant badge shows `Local LoRA Tutor / L4 Runtime`.
9. Stop the local server and ask again.
10. Confirm fallback to `AI học tập Level 3 / Internal L3 Tutor`.

## Troubleshooting

### L3 still shows Gemini/OpenAI

Check:

- Session `aiRuntimeMode` is actually `learning_engine_l3`
- `L3_ALLOW_EXTERNAL_FALLBACK` is not set to `true`
- The returned assistant message metadata includes `provider`, `aiRuntimeMode`, and `externalFallbackUsed`

If `externalFallbackUsed=true`, the external provider badge is expected and should display as `L3 fallback · ...`.

### The UI still says realtime is disconnected

Check:

- `window.__CHATBOT_AI_SOCKET_TEST__?.state()` in dev tools returns `connected`
- the dashboard session is still selected after login
- `VITE_SOCKET_URL` still points at the API origin
- `/health` is reachable and the API dev process is actually running

If the socket test handle says `connected` but the banner still stays visible, the client transport lifecycle is out of sync and `apps/web/src/hooks/use-chat-socket.ts` should be rechecked before changing server auth or CORS.

### L3 returns the local safe fallback

This means:

- the active model override failed or was unavailable, and
- `InternalL3TutorModelService` failed, so the safe study fallback took over

Check API logs for `Internal L3 Tutor failed`.

### AI Lab evals show poor Local LoRA results

This is still possible even after the v2 retrain:

- the real runtime path is valid
- the current v2 adapter improves over v1, but it is still a small LoRA fine-tune on `90/10` train/validation examples
- local serving must actually run on `device=cuda`; if it stays on CPU, timeout rates will spike
- even on CUDA, quality still trails `internal_l3_tutor` and average latency remains high

Treat the current result as a validated fine-tuned runtime milestone, not a production-quality claim.

### Local LoRA does not activate in Learning Engine mode

Check:

- `LOCAL_LORA_ENABLED=true`
- the local server is reachable at `LOCAL_LORA_BASE_URL`
- the target model version is `ready` and active in the `local_lora` runtime group
- migration `20260515143000_add_local_lora_provider_key` has been applied
- `pnpm test` still passes after any Local LoRA config change

If the local server is offline, the router should fall back to `Internal L3 Tutor` without touching Gemini/OpenAI unless `L3_ALLOW_EXTERNAL_FALLBACK=true`.

### Local LoRA server says CUDA is available but benchmark latency is still terrible

Check:

- `GET http://localhost:8008/health` returns `device=cuda`
- the server was started with `--adapter ml/adapters/local-lora-tutor-v2 --model local-lora-tutor-v2`
- `LOCAL_LORA_MAX_NEW_TOKENS` is capped to a reasonable value like `64`

If `/health` shows `cudaAvailable=true` but `device=cpu`, the model was not actually moved onto the GPU and the benchmark result is not representative.

## Health fields

The `/health` response now includes:

- `mode`
- `availableRuntimeModes`
- `defaultRuntimeMode`
- `l3InternalModel`
- `l3InternalModelName`
- `l3ExternalFallbackAllowed`
- `localFallbackEnabled`
- provider diagnostics and issues
