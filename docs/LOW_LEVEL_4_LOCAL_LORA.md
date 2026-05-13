# Low Level 4 Local LoRA Setup

## Overview
This document describes how to train and serve a Local LoRA model for the Vietnamese Study Assistant, upgrading it to Level 4 (L4). The L4 runtime runs locally and acts as the primary learning engine when enabled, with `internal_l3_tutor` serving as the fallback.

## 1. Export Dataset
First, approve at least 20 `TrainingExamples` in the AI Lab UI.
Run the dataset export script to generate a JSONL file:
```bash
node scripts/export-l4-dataset.mjs --dataset-id <id> --out ml/datasets/train.jsonl --validation-out ml/datasets/val.jsonl
```

## 2. Train Local LoRA
Navigate to the `ml` workspace. It uses standard Hugging Face tools (`transformers`, `peft`, `trl`).
Install requirements:
```bash
pip install transformers datasets peft trl torch pyyaml
```
Run the training script (it defaults to mocking training if no GPU is found, for local dev testing):
```bash
python ml/scripts/train_lora_sft.py --config ml/configs/l4-low-sft.yaml --dataset ml/datasets/train.jsonl
```
This generates the adapter in `ml/adapters/local-lora-tutor-v1`.

## 3. Serve Local Inference
Start the FastAPI mock/real server:
```bash
pip install fastapi uvicorn
python ml/scripts/serve_local_lora.py
```
This runs an inference provider on `http://localhost:8008`.

## 4. API Backend Integration
The Node API uses `LOCAL_LORA_ENABLED=true` in `.env` to load the `LocalLoraProvider`.
When a session is set to `learning_engine_l3`, it will attempt to use `local_lora` if configured in the model registry. If `local_lora` is unavailable or errors out, it falls back gracefully to `internal_l3_tutor`.
