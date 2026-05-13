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
```

Default behavior:

- Level 3 does not call Gemini/OpenAI.
- External API mode still does.
- Local fallback stays enabled if the internal tutor path fails.

## Manual smoke checklist

1. Start `pnpm dev:api` and `pnpm dev:web`.
2. Open the app and sign in as guest.
3. Open a session and switch to `AI học tập Level 3`.
4. Ask a Vietnamese study question.
5. Confirm the assistant badge shows `AI học tập Level 3` or `L3 Tutor Model`, not Gemini/OpenAI.
6. Switch to `API AI lớn`.
7. Ask again and confirm the badge shows the real external provider.
8. Check `GET /health` and confirm:
   - `availableRuntimeModes`
   - `defaultRuntimeMode`
   - `l3InternalModel`
   - `l3InternalModelName`
   - `l3ExternalFallbackAllowed`

## Troubleshooting

### L3 still shows Gemini/OpenAI

Check:

- Session `aiRuntimeMode` is actually `learning_engine_l3`
- `L3_ALLOW_EXTERNAL_FALLBACK` is not set to `true`
- The returned assistant message metadata includes `provider`, `aiRuntimeMode`, and `externalFallbackUsed`

If `externalFallbackUsed=true`, the external provider badge is expected and should display as `L3 fallback · ...`.

### L3 returns the local safe fallback

This means:

- the active model override failed or was unavailable, and
- `InternalL3TutorModelService` failed, so the safe study fallback took over

Check API logs for `Internal L3 Tutor failed`.

### AI Lab shows Internal L3 Tutor but evals cannot benchmark it

This is expected today. The eval runner benchmarks external or fine-tuned OpenAI/Gemini runtime adapters. Internal L3 Tutor remains visible in the model registry panel but is filtered out of the benchmark model-version picker.

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
