"""
Low Level 4 Local LoRA Serving Script.

Real serving requires:
  pip install fastapi uvicorn torch transformers peft
"""
import argparse
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


app = FastAPI(title="Local LoRA Tutor Inference Server")


class Message(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[Message]
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    max_new_tokens: Optional[int] = None
    top_p: Optional[float] = None


MODEL = None
TOKENIZER = None
MOCK_MODE = False
MODEL_NAME = "local-lora-tutor-v1"
ADAPTER_PATH = "ml/adapters/local-lora-tutor-v1"
ADAPTER_LOADED = False
CUDA_AVAILABLE = False
TRAINING_METADATA: Dict[str, Any] | None = None
TRAINING_METADATA_PATH: str | None = None
SERVING_DEVICE = "cpu"
GENERATION_CONFIG: Dict[str, Any] = {
    "max_new_tokens": 64,
    "temperature": 0.2,
    "top_p": 0.9,
}
CONTEXT_MAX_CHARS = 6000


def read_generation_config_from_env() -> Dict[str, Any]:
    max_new_tokens = int(os.environ.get("LOCAL_LORA_MAX_NEW_TOKENS", "64") or "64")
    temperature = float(os.environ.get("LOCAL_LORA_TEMPERATURE", "0.2") or "0.2")
    top_p = float(os.environ.get("LOCAL_LORA_TOP_P", "0.9") or "0.9")

    return {
        "max_new_tokens": max(16, min(max_new_tokens, 256)),
        "temperature": max(0.0, min(temperature, 2.0)),
        "top_p": max(0.1, min(top_p, 1.0)),
    }


def resolve_context_max_chars() -> int:
    value = int(os.environ.get("LOCAL_LORA_CONTEXT_MAX_CHARS", "6000") or "6000")
    return max(500, min(value, 20000))


def build_startup_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    parser.add_argument("--adapter", "--adapter_dir", dest="adapter_dir", type=str, default="ml/adapters/local-lora-tutor-v1")
    parser.add_argument("--model", dest="model_name", type=str, default=None)
    parser.add_argument("--mock", action="store_true", help="Run in mock mode without loading real models")
    return parser


def build_server_arg_parser() -> argparse.ArgumentParser:
    parser = build_startup_arg_parser()
    parser.add_argument("--port", type=int, default=8008)
    parser.add_argument("--host", type=str, default="0.0.0.0")
    parser.add_argument("--reload", action="store_true", help="Enable auto reload for local development")
    return parser


def render_messages_as_prompt(messages: List[Dict[str, str]], tokenizer: Any) -> str:
    normalized = [
        {
            "role": message.get("role", "user"),
            "content": message.get("content", "").strip(),
        }
        for message in messages
        if isinstance(message, dict) and isinstance(message.get("content"), str) and message.get("content", "").strip()
    ]

    if hasattr(tokenizer, "apply_chat_template"):
        try:
            return tokenizer.apply_chat_template(
                normalized,
                tokenize=False,
                add_generation_prompt=True,
            )
        except Exception:
            pass

    lines = [f"{item['role'].upper()}: {item['content']}" for item in normalized]
    lines.append("ASSISTANT:")
    return "\n\n".join(lines)


def build_health_payload() -> Dict[str, Any]:
    return {
        "status": "ok",
        "mode": "mock" if MOCK_MODE else "real",
        "mockMode": MOCK_MODE,
        "model": MODEL_NAME,
        "adapterLoaded": ADAPTER_LOADED,
        "modelLoaded": MODEL is not None,
        "adapterPath": ADAPTER_PATH,
        "trainingMetadataPath": TRAINING_METADATA_PATH,
        "cudaAvailable": CUDA_AVAILABLE,
        "device": SERVING_DEVICE,
        "baseModel": TRAINING_METADATA.get("baseModel") if TRAINING_METADATA else None,
        "isMockTraining": TRAINING_METADATA.get("isMockTraining") if TRAINING_METADATA else MOCK_MODE,
        "generationConfig": GENERATION_CONFIG,
        "contextMaxChars": CONTEXT_MAX_CHARS,
    }


def trim_prompt(prompt: str, max_chars: int) -> str:
    if len(prompt) <= max_chars:
        return prompt

    head = max_chars // 2
    tail = max_chars - head - 7
    return f"{prompt[:head]}\n...\n{prompt[-tail:]}"


def resolve_request_max_new_tokens(request: ChatCompletionRequest) -> int:
    value = request.max_new_tokens if request.max_new_tokens is not None else request.max_tokens
    if value is None:
        value = GENERATION_CONFIG["max_new_tokens"]
    return max(1, min(int(value), 256))


def resolve_request_temperature(request: ChatCompletionRequest) -> float:
    value = request.temperature if request.temperature is not None else GENERATION_CONFIG["temperature"]
    return max(0.0, min(float(value), 2.0))


def resolve_request_top_p(request: ChatCompletionRequest) -> float:
    value = request.top_p if request.top_p is not None else GENERATION_CONFIG["top_p"]
    return max(0.1, min(float(value), 1.0))


@app.on_event("startup")
def load_model() -> None:
    global MODEL, TOKENIZER, MOCK_MODE, MODEL_NAME, ADAPTER_PATH, ADAPTER_LOADED, CUDA_AVAILABLE, TRAINING_METADATA, TRAINING_METADATA_PATH, SERVING_DEVICE, GENERATION_CONFIG, CONTEXT_MAX_CHARS
    args, _ = build_startup_arg_parser().parse_known_args()

    MODEL = None
    TOKENIZER = None
    ADAPTER_LOADED = False
    TRAINING_METADATA = None
    TRAINING_METADATA_PATH = None
    SERVING_DEVICE = "cpu"
    GENERATION_CONFIG = read_generation_config_from_env()
    CONTEXT_MAX_CHARS = resolve_context_max_chars()
    MOCK_MODE = args.mock
    ADAPTER_PATH = args.adapter_dir
    MODEL_NAME = args.model_name or os.environ.get("LOCAL_LORA_MODEL", "local-lora-tutor-v1")

    if MOCK_MODE:
        print("Starting Local LoRA server in MOCK MODE.")
        return

    adapter_dir = Path(args.adapter_dir)
    metadata_path = adapter_dir / "training-metadata.json"
    TRAINING_METADATA_PATH = str(metadata_path)

    if not adapter_dir.exists() or not metadata_path.exists():
        print(f"Adapter artifacts missing at {adapter_dir}. Falling back to MOCK MODE.")
        MOCK_MODE = True
        return

    try:
        TRAINING_METADATA = json.loads(metadata_path.read_text(encoding="utf-8"))
    except Exception as error:
        print(f"Could not read training metadata: {error}. Falling back to MOCK MODE.")
        MOCK_MODE = True
        return

    if TRAINING_METADATA.get("isMockTraining"):
        print("Training metadata reports mock training. Serving in MOCK MODE.")
        MOCK_MODE = True
        return

    try:
        import torch
        from peft import PeftModel
        from transformers import AutoModelForCausalLM, AutoTokenizer

        CUDA_AVAILABLE = bool(torch.cuda.is_available())
        if CUDA_AVAILABLE:
            torch.backends.cuda.matmul.allow_tf32 = True
        SERVING_DEVICE = "cuda" if CUDA_AVAILABLE else "cpu"
        MODEL_NAME = args.model_name or TRAINING_METADATA.get("fineTunedModel") or TRAINING_METADATA.get("adapterName") or MODEL_NAME
        base_model = TRAINING_METADATA.get("baseModel") or "HuggingFaceTB/SmolLM2-135M-Instruct"

        TOKENIZER = AutoTokenizer.from_pretrained(base_model)
        if TOKENIZER.pad_token is None:
            TOKENIZER.pad_token = TOKENIZER.eos_token or TOKENIZER.unk_token

        torch_dtype = (
            torch.bfloat16
            if CUDA_AVAILABLE and torch.cuda.is_bf16_supported()
            else torch.float16
            if CUDA_AVAILABLE
            else torch.float32
        )

        base = AutoModelForCausalLM.from_pretrained(base_model, torch_dtype=torch_dtype)
        MODEL = PeftModel.from_pretrained(base, str(adapter_dir))
        if CUDA_AVAILABLE:
            MODEL = MODEL.to("cuda")
            model_device = str(next(MODEL.parameters()).device)
            if not model_device.startswith("cuda"):
                raise RuntimeError("CUDA is available but the Local LoRA model did not move to CUDA")
        MODEL.eval()
        ADAPTER_LOADED = True
        print(f"Loaded Local LoRA adapter from {adapter_dir} on {SERVING_DEVICE}")
    except Exception as error:
        print(f"Error loading Local LoRA adapter: {error}")
        print("Falling back to MOCK MODE.")
        MOCK_MODE = True
        MODEL = None
        TOKENIZER = None
        ADAPTER_LOADED = False


@app.get("/health")
async def health() -> Dict[str, Any]:
    return build_health_payload()


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest) -> Dict[str, Any]:
    global MODEL, TOKENIZER, MOCK_MODE

    if MOCK_MODE:
        time.sleep(0.5)
        user_message = next((item.content for item in reversed(request.messages) if item.role == "user"), "No user message")
        return {
            "id": f"mock-chatcmpl-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": request.model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": f"[MOCK LOCAL LORA] Bạn vừa hỏi: {user_message}\n\nĐây là câu trả lời mô phỏng từ model {request.model} đã được fine-tune.",
                    },
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 30,
                "total_tokens": 40,
            },
        }

    if MODEL is None or TOKENIZER is None:
        raise HTTPException(status_code=503, detail="Local LoRA model is not loaded.")

    try:
        import torch

        prompt = render_messages_as_prompt(
            [{"role": message.role, "content": message.content} for message in request.messages],
            TOKENIZER,
        )
        trimmed_prompt = trim_prompt(prompt, CONTEXT_MAX_CHARS)
        inputs = TOKENIZER(trimmed_prompt, return_tensors="pt", truncation=True)
        inputs = {key: value.to(MODEL.device) for key, value in inputs.items()}
        temperature = resolve_request_temperature(request)
        max_new_tokens = resolve_request_max_new_tokens(request)
        top_p = resolve_request_top_p(request)

        with torch.inference_mode():
            generation_kwargs = {
                "max_new_tokens": max_new_tokens,
                "temperature": temperature,
                "do_sample": temperature > 0,
                "pad_token_id": TOKENIZER.eos_token_id,
                "use_cache": True,
            }
            if temperature > 0:
                generation_kwargs["top_p"] = top_p

            outputs = MODEL.generate(
                **inputs,
                **generation_kwargs,
            )

        generated_tokens = outputs[0][len(inputs["input_ids"][0]) :]
        response_text = TOKENIZER.decode(generated_tokens, skip_special_tokens=True).strip()
        if not response_text:
            raise RuntimeError("Local LoRA model returned empty content")

        return {
            "id": f"local-chatcmpl-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": request.model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": response_text,
                    },
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": int(len(inputs["input_ids"][0])),
                "completion_tokens": int(len(generated_tokens)),
                "total_tokens": int(len(inputs["input_ids"][0]) + len(generated_tokens)),
            },
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Local LoRA inference failed: {error}")


if __name__ == "__main__":
    import uvicorn

    args, _ = build_server_arg_parser().parse_known_args()

    if args.reload:
        uvicorn.run("ml.scripts.serve_local_lora:app", host=args.host, port=args.port, reload=True)
    else:
        uvicorn.run(app, host=args.host, port=args.port, reload=False)
