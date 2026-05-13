# AI Level 3 Runtime Notes

## Runtime modes

| Mode | Key | Default execution path |
| --- | --- | --- |
| External AI API | `external_api` | `AIOrchestratorService` with the existing Gemini/OpenAI fallback policy. |
| AI học tập Level 3 | `learning_engine_l3` | `AiRuntimeRouterService` → active L3 `ModelVersion` if one is ready → `InternalL3TutorModelService` → local study fallback. |

`learning_engine_l3` now defaults to an internal provider:

- Provider key: `internal_l3_tutor`
- Display name: `Internal L3 Tutor`
- Default model name: `internal-l3-tutor-v1`

Gemini/OpenAI are **not** called by default in Level 3 mode. External fallback is opt-in only:

```env
L3_ALLOW_EXTERNAL_FALLBACK=false
```

This is still **Level 3**, not Level 4. The internal tutor is a deterministic app-owned runtime path built from tutor policy, retrieval context, structured study behavior, and model-registry wiring. It is not a trained-from-scratch model and it is not local LLM inference.

## L3 execution order

For `learning_engine_l3`, the router executes this order:

1. Active ready L3 `ModelVersion` through `ModelGatewayService` if the active model is benchmarkable through the external runtime adapters.
2. `InternalL3TutorModelService` with local tutor policy, session context, and retrieval/material context.
3. Local study fallback if the internal tutor path fails.
4. `AIOrchestratorService` only when `L3_ALLOW_EXTERNAL_FALLBACK=true`.

This keeps the Level 4 path open:

- `ModelRegistryService` still supports model-version overrides.
- `FineTuneAdapter` and Local LoRA scaffolding remain intact.
- External API mode still uses Gemini/OpenAI normally.

## Metadata contract

Assistant messages produced in L3 now carry runtime metadata that distinguishes internal execution from external fallback:

- `aiRuntimeMode: learning_engine_l3`
- `provider: internal_l3_tutor` for the internal path
- `model: internal-l3-tutor-v1` by default
- `learningEngineUsed: true`
- `externalFallbackUsed: false` unless the opt-in fallback path was used
- `modelVersionId` when an active model override executed successfully

The chat UI uses this metadata for the provider badge:

- Internal L3 path: `AI học tập Level 3` / `L3 Tutor Model`
- Explicit external fallback: `L3 fallback · GEMINI` or `L3 fallback · OPENAI`
- External API mode: normal provider badge

## Health and diagnostics

`GET /health` now exposes:

- `availableRuntimeModes`
- `defaultRuntimeMode`
- `l3InternalModel`
- `l3InternalModelName`
- `l3ExternalFallbackAllowed`

`pnpm ai:doctor` now reports the same L3 runtime flags from env and from the live `/health` payload when the API is reachable.

## Key files

- `apps/api/src/integrations/ai/ai-runtime-router.service.ts`
- `apps/api/src/integrations/ai/internal-l3-tutor-model.service.ts`
- `apps/api/src/integrations/ai/local-study-fallback.ts`
- `apps/api/src/modules/chat/chat.service.ts`
- `apps/api/src/modules/chat/session-intelligence.service.ts`
- `apps/api/src/modules/model-registry/model-registry.service.ts`
- `apps/web/src/components/chat/ProviderBadge.tsx`
- `apps/web/src/components/layout/WorkspaceSettingsSheet.tsx`
- `apps/web/src/features/ai-lab/AiLabPage.tsx`
- `packages/shared/src/constants/providers.ts`
- `packages/shared/src/types/ai-runtime.ts`
- `prisma/migrations/20260512000000_add_session_ai_runtime_mode/migration.sql`
- `prisma/migrations/20260513083000_add_internal_l3_tutor_provider/migration.sql`

## Guardrails

1. No frontend path calls Gemini/OpenAI directly.
2. External AI mode remains unchanged.
3. Level 3 does not claim a real fine-tuned or locally inferred model.
4. The internal tutor path still preserves the existing chat response contract.
5. Local fallback remains available if the internal tutor path fails.
