# AI Runtime Runbook

## Supported Boot Commands

Use these commands for normal validation in this workspace:

- `pnpm dev:api`
- `pnpm dev:web`
- `pnpm dev`

`node apps/api/dist/server.js` from the repo root is still not the standard validation path here.

## L3 Runtime Flags

```env
L3_ALLOW_EXTERNAL_FALLBACK=false
L3_INTERNAL_MODEL_NAME=internal-l3-tutor-v1
LOCAL_LORA_ENABLED=true
LOCAL_LORA_BASE_URL=http://localhost:8008
LOCAL_LORA_MODEL=local-lora-tutor-v4
LOCAL_LORA_TIMEOUT_MS=30000
LOCAL_LORA_MAX_NEW_TOKENS=64
LOCAL_LORA_TEMPERATURE=0.2
LOCAL_LORA_TOP_P=0.9
LOCAL_LORA_CONTEXT_MAX_CHARS=6000
```

Default behavior:

- `learning_engine_l3` does not call Gemini/OpenAI unless `L3_ALLOW_EXTERNAL_FALLBACK=true`
- `API AI lớn` still uses configured external providers
- `Internal L3 Tutor` remains the safe fallback if the Local LoRA runtime fails

## Current Local LoRA State

Validated on 2026-05-17:

- active Local LoRA model: `local-lora-tutor-v4`
- dataset: `DEV Targeted L4 Tutor v4`
- dataset size: `180` approved examples
- export split: `162` train / `18` validation
- serving mode: `real`
- device: `cuda`
- prompt shaping: shorter local-only tutor prompt, task-specific templates, tighter context trimming, `repetition_penalty=1.05`
- stronger Phase 9 benchmark result:
  - `internal_l3_tutor averageScore=0.32`
  - `local_lora v3 averageScore=0.07`
  - `local_lora v4 averageScore=0.06`
  - `local_lora v4 averageLatencyMs=7355`
  - `local_lora v4 timeoutCount=0`
  - `local_lora v4 fallbackCount=0`
  - `local_lora v4 errorCount=0`

This is still not a full Level 4 claim because local quality did not improve over v3 on the stronger suite.

## Real Local LoRA Smoke

1. Start the local server:

```powershell
.\.venv-l4\Scripts\python.exe ml/scripts/serve_local_lora.py --adapter ml/adapters/local-lora-tutor-v4 --model local-lora-tutor-v4
```

2. Check local server health:

```powershell
Invoke-RestMethod http://localhost:8008/health
```

Expected:

- `mode=real`
- `adapterLoaded=true`
- `modelLoaded=true`
- `model=local-lora-tutor-v4`
- `device=cuda`
- `generationConfig.max_new_tokens=64`
- `generationConfig.temperature=0.2`
- `generationConfig.top_p=0.9`
- `generationConfig.repetition_penalty=1.05`

3. Register the real adapter:

```powershell
node scripts/register-local-lora-model.mjs --real --model local-lora-tutor-v4 --adapter ml/adapters/local-lora-tutor-v4
```

4. Start app servers:

```powershell
pnpm dev:api
pnpm dev:web
```

5. In the browser:

- open a fresh session
- switch to `AI học tập Level 3`
- ask `Giải thích tính đóng gói trong OOP Java bằng ví dụ ngắn.`
- confirm badge: `Local LoRA Tutor / L4 Runtime / local-lora-tutor-v4`
- confirm no Gemini/OpenAI badge is shown
- confirm latency is recorded

6. Stop the local server and ask:

- `Cho mình một câu hỏi luyện tập ngắn về kế thừa trong Java.`
- confirm fallback badge: `AI học tập Level 3 / L3 Tutor Model`
- confirm Gemini/OpenAI are still not used while `L3_ALLOW_EXTERNAL_FALLBACK=false`

7. Switch back to `API AI lớn` and ask again.

- confirm an external provider badge appears when a real provider is configured
- if provider quota is exhausted, keep the visible warning and fallback metadata; do not hide it

## Troubleshooting

### L3 Still Shows Gemini/OpenAI

Check:

- the session `aiRuntimeMode` is really `learning_engine_l3`
- `L3_ALLOW_EXTERNAL_FALLBACK` is still `false`
- the assistant response metadata shows whether an external fallback was used

### Local LoRA Shows CUDA Available but Is Still Slow

Check:

- `GET http://localhost:8008/health` returns `device=cuda`
- the server was started with `--adapter ml/adapters/local-lora-tutor-v4 --model local-lora-tutor-v4`
- `LOCAL_LORA_MAX_NEW_TOKENS` stays around `64`
- long chat history is being trimmed before the local call
- benchmark execution does not flood the single local server with parallel requests

### AI Lab Evals Show Weak Local LoRA Quality

This is still possible even after the Phase 9 targeted retrain:

- the real runtime path is valid
- latency stayed near the Phase 8 range
- quality did not improve over v3 on the stronger suite
- `internal_l3_tutor` still wins clearly on quality

Treat the current result as a validated local fine-tuning and runtime milestone with honest limits, not a production-quality claim.
