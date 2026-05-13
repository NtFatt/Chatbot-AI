"""
Low Level 4 Local LoRA Serving Script.
Requires:
  pip install fastapi uvicorn transformers peft torch
"""
import os
import argparse
import time
import json
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

app = FastAPI(title="Local LoRA Tutor Inference Server")

class Message(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[Message]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1024

MODEL = None
TOKENIZER = None
MOCK_MODE = False

@app.on_event("startup")
def load_model():
    global MODEL, TOKENIZER, MOCK_MODE
    parser = argparse.ArgumentParser()
    parser.add_argument("--adapter_dir", type=str, default="ml/adapters/local-lora-tutor-v1")
    parser.add_argument("--mock", action="store_true", help="Run in mock mode without loading real models")
    args, _ = parser.parse_known_args()

    MOCK_MODE = args.mock
    
    if MOCK_MODE:
        print("Starting in MOCK MODE. No real models will be loaded.")
        return

    adapter_dir = args.adapter_dir
    if not os.path.exists(adapter_dir):
        print(f"Warning: Adapter dir {adapter_dir} not found. Using MOCK MODE.")
        MOCK_MODE = True
        return
        
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from peft import PeftModel
        
        metadata_path = os.path.join(adapter_dir, "training_metadata.json")
        if not os.path.exists(metadata_path):
            print("No training metadata found. Defaulting to mock mode.")
            MOCK_MODE = True
            return
            
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
            
        base_model = metadata.get("baseModel", "Qwen/Qwen2.5-0.5B-Instruct")
        
        print(f"Loading base model {base_model}...")
        TOKENIZER = AutoTokenizer.from_pretrained(base_model)
        
        base = AutoModelForCausalLM.from_pretrained(
            base_model,
            torch_dtype=torch.bfloat16 if torch.cuda.is_available() and torch.cuda.is_bf16_supported() else torch.float16,
            device_map="auto"
        )
        print(f"Loading adapter from {adapter_dir}...")
        MODEL = PeftModel.from_pretrained(base, adapter_dir)
        MODEL.eval()
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
        print("Falling back to MOCK MODE.")
        MOCK_MODE = True

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    global MODEL, TOKENIZER, MOCK_MODE
    
    messages_dicts = [{"role": m.role, "content": m.content} for m in request.messages]
    
    if MOCK_MODE:
        # Generate a deterministic mock response for testing
        time.sleep(0.5) # Simulate latency
        user_msg = next((m.content for m in reversed(request.messages) if m.role == "user"), "No user message")
        
        return {
            "id": f"mock-chatcmpl-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": request.model,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": f"[MOCK LOCAL LORA] Bạn vừa hỏi: {user_msg}\n\nĐây là câu trả lời mô phỏng từ model {request.model} đã được fine-tune."
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 30,
                "total_tokens": 40
            }
        }
        
    try:
        import torch
        prompt = TOKENIZER.apply_chat_template(messages_dicts, tokenize=False, add_generation_prompt=True)
        inputs = TOKENIZER(prompt, return_tensors="pt").to(MODEL.device)
        
        with torch.no_grad():
            outputs = MODEL.generate(
                **inputs,
                max_new_tokens=request.max_tokens,
                temperature=request.temperature,
                do_sample=True,
                pad_token_id=TOKENIZER.eos_token_id
            )
            
        generated_tokens = outputs[0][len(inputs.input_ids[0]):]
        response_text = TOKENIZER.decode(generated_tokens, skip_special_tokens=True)
        
        return {
            "id": f"local-chatcmpl-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": request.model,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": response_text
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": len(inputs.input_ids[0]),
                "completion_tokens": len(generated_tokens),
                "total_tokens": len(inputs.input_ids[0]) + len(generated_tokens)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8008)
    parser.add_argument("--host", type=str, default="0.0.0.0")
    args, _ = parser.parse_known_args()
    
    uvicorn.run("serve_local_lora:app", host=args.host, port=args.port, reload=True)
