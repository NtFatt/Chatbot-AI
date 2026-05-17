"""
Low Level 4 Local LoRA Training Script.

Real training requires:
  pip install torch transformers datasets peft pyyaml accelerate

Optional:
  pip install trl bitsandbytes
"""
import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train a Local LoRA adapter")
    parser.add_argument("--config", type=str, default="ml/configs/l4-low-sft.yaml")
    parser.add_argument("--dataset", type=str, required=True, help="Path to train JSONL dataset")
    parser.add_argument("--validation", type=str, help="Path to validation JSONL dataset")
    parser.add_argument("--output", "--output-dir", dest="output_dir", type=str, help="Optional output directory override")
    parser.add_argument("--adapter-name", type=str, help="Optional adapter/model name override")
    parser.add_argument("--dataset-name", type=str, help="Optional dataset display name for metadata")
    parser.add_argument("--dataset-id", type=str, help="Optional dataset id for metadata")
    parser.add_argument(
        "--targeted-failure-modes",
        type=str,
        help="Optional comma-separated failure modes that this dataset targets",
    )
    parser.add_argument(
        "--notes",
        type=str,
        default="LoRA SFT fine-tuning run. This is adapter training, not full model training from scratch.",
        help="Optional metadata note for the training run",
    )
    parser.add_argument("--mock", action="store_true", help="Write mock adapter metadata instead of real training")
    return parser.parse_args(argv)


def read_config(config_path: str) -> Dict[str, Any]:
    import yaml

    with open(config_path, "r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def count_jsonl_rows(dataset_path: Optional[str]) -> int:
    if not dataset_path:
        return 0

    with open(dataset_path, "r", encoding="utf-8") as handle:
        return sum(1 for line in handle if line.strip())


def resolve_git_commit() -> Optional[str]:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip() or None
    except Exception:
        return None


def resolve_output_dir(config: Dict[str, Any], args: argparse.Namespace) -> Path:
    return Path(args.output_dir or config.get("output_dir", "ml/adapters/local-lora-tutor-v1"))


def resolve_adapter_name(config: Dict[str, Any], output_dir: Path, explicit_adapter_name: Optional[str]) -> str:
    if explicit_adapter_name:
        return explicit_adapter_name

    configured_name = config.get("adapter_name")
    configured_output_dir = Path(str(config.get("output_dir", output_dir)))
    if configured_name and configured_output_dir.name == output_dir.name:
        return str(configured_name)

    return output_dir.name


def detect_device(torch_module: Any) -> Dict[str, Any]:
    cuda_available = bool(torch_module.cuda.is_available())
    if cuda_available:
        try:
            device_name = torch_module.cuda.get_device_name(0)
        except Exception:
            device_name = "cuda"
        return {
            "device": device_name,
            "trainer_device": "cuda",
            "cudaAvailable": True,
        }

    mps_backend = getattr(torch_module.backends, "mps", None)
    if mps_backend and mps_backend.is_available():
        return {
            "device": "mps",
            "trainer_device": "mps",
            "cudaAvailable": False,
        }

    return {
        "device": "cpu",
        "trainer_device": "cpu",
        "cudaAvailable": False,
    }


def render_messages_as_prompt(messages: Iterable[Dict[str, str]], tokenizer: Any) -> str:
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
                add_generation_prompt=False,
            )
        except Exception:
            pass

    lines: List[str] = []
    for message in normalized:
        lines.append(f"{message['role'].upper()}: {message['content']}")

    if not normalized or normalized[-1]["role"] != "assistant":
        lines.append("ASSISTANT:")

    return "\n\n".join(lines)


def tokenize_example(example: Dict[str, Any], tokenizer: Any, max_seq_length: int) -> Dict[str, Any]:
    prompt = render_messages_as_prompt(example["messages"], tokenizer)
    tokenized = tokenizer(
        prompt,
        padding="max_length",
        truncation=True,
        max_length=max_seq_length,
    )
    tokenized["labels"] = list(tokenized["input_ids"])
    return tokenized


def infer_target_modules(model: Any, torch_module: Any) -> List[str]:
    preferred = [
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj",
        "c_attn",
        "c_proj",
        "c_fc",
    ]
    linear_names = []
    for name, module in model.named_modules():
        if isinstance(module, torch_module.nn.Linear):
            leaf_name = name.split(".")[-1]
            if leaf_name != "lm_head":
                linear_names.append(leaf_name)

    deduped = sorted(set(linear_names))
    inferred = [name for name in preferred if name in deduped]
    if inferred:
        return inferred

    return deduped[:6]


def build_training_metadata(
    *,
    config: Dict[str, Any],
    adapter_name: str,
    base_model: str,
    dataset_path: str,
    validation_path: Optional[str],
    dataset_name: Optional[str],
    dataset_id: Optional[str],
    training_example_count: int,
    validation_example_count: int,
    targeted_failure_modes: Optional[List[str]],
    is_mock_training: bool,
    device: str,
    cuda_available: bool,
    started_at: str,
    completed_at: str,
    training_duration_seconds: float,
    final_train_loss: Optional[float],
    final_eval_loss: Optional[float],
    notes: Optional[str],
) -> Dict[str, Any]:
    return {
        "isMockTraining": is_mock_training,
        "baseModel": base_model,
        "adapterName": adapter_name,
        "fineTunedModel": adapter_name,
        "datasetName": dataset_name,
        "datasetId": dataset_id,
        "datasetPath": dataset_path,
        "validationPath": validation_path,
        "trainingExampleCount": training_example_count,
        "validationExampleCount": validation_example_count,
        "targetedFailureModes": targeted_failure_modes or [],
        "epochs": config.get("num_train_epochs", 1),
        "learningRate": float(config.get("learning_rate", 2e-4)),
        "loraRank": config.get("lora_r", 16),
        "loraAlpha": config.get("lora_alpha", 32),
        "loraDropout": config.get("lora_dropout", 0.05),
        "maxSeqLength": config.get("max_seq_length", 1024),
        "device": device,
        "cudaAvailable": cuda_available,
        "startedAt": started_at,
        "completedAt": completed_at,
        "trainingDurationSeconds": round(training_duration_seconds, 2),
        "finalTrainLoss": final_train_loss,
        "finalEvalLoss": final_eval_loss,
        "gitCommit": resolve_git_commit(),
        "notes": notes,
    }


def write_training_metadata(output_dir: Path, metadata: Dict[str, Any]) -> Path:
    metadata_path = output_dir / "training-metadata.json"
    metadata_path.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return metadata_path


def extract_last_metric(log_history: List[Dict[str, Any]], key: str) -> Optional[float]:
    for entry in reversed(log_history):
        if key in entry:
            try:
                return float(entry[key])
            except Exception:
                return None
    return None


def run_mock_training(args: argparse.Namespace, config: Dict[str, Any]) -> Dict[str, Any]:
    output_dir = resolve_output_dir(config, args)
    output_dir.mkdir(parents=True, exist_ok=True)
    adapter_name = resolve_adapter_name(config, output_dir, args.adapter_name)
    started_at = datetime.now(timezone.utc).isoformat()
    metadata = build_training_metadata(
        config=config,
        adapter_name=adapter_name,
        base_model=config.get("base_model", "HuggingFaceTB/SmolLM2-135M-Instruct"),
        dataset_path=args.dataset,
        validation_path=args.validation,
        dataset_name=args.dataset_name,
        dataset_id=args.dataset_id,
        training_example_count=count_jsonl_rows(args.dataset),
        validation_example_count=count_jsonl_rows(args.validation),
        targeted_failure_modes=[item.strip() for item in (args.targeted_failure_modes or "").split(",") if item.strip()],
        is_mock_training=True,
        device="mock",
        cuda_available=False,
        started_at=started_at,
        completed_at=started_at,
        training_duration_seconds=0,
        final_train_loss=None,
        final_eval_loss=None,
        notes=args.notes,
    )
    (output_dir / "adapter_config.json").write_text(
        json.dumps({"mock": True, "adapterName": adapter_name}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    metadata_path = write_training_metadata(output_dir, metadata)
    print(f"Mock adapter metadata written to {metadata_path}")
    return metadata


def main() -> None:
    args = parse_args()
    config = read_config(args.config)
    if args.mock:
        run_mock_training(args, config)
        return

    try:
        import torch
        from datasets import load_dataset
        from peft import LoraConfig, get_peft_model
        from accelerate import __version__ as _accelerate_version  # noqa: F401
        from transformers import (
            AutoModelForCausalLM,
            AutoTokenizer,
            DataCollatorForLanguageModeling,
            Trainer,
            TrainingArguments,
        )
    except ImportError as error:
        print(f"Missing required packages: {error}")
        print("Run: pip install torch transformers datasets peft pyyaml accelerate")
        sys.exit(1)

    base_model = config.get("base_model", "HuggingFaceTB/SmolLM2-135M-Instruct")
    output_dir = resolve_output_dir(config, args)
    output_dir.mkdir(parents=True, exist_ok=True)
    adapter_name = resolve_adapter_name(config, output_dir, args.adapter_name)
    max_seq_length = int(config.get("max_seq_length", 1024))
    training_example_count = count_jsonl_rows(args.dataset)
    validation_example_count = count_jsonl_rows(args.validation)
    device_state = detect_device(torch)

    started_at = datetime.now(timezone.utc).isoformat()
    started_at_seconds = time.time()

    print(f"Loading base model: {base_model}")
    print(f"Training device: {device_state['device']}")

    tokenizer = AutoTokenizer.from_pretrained(base_model)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token or tokenizer.unk_token

    torch_dtype = (
        torch.bfloat16
        if device_state["trainer_device"] == "cuda" and torch.cuda.is_bf16_supported()
        else torch.float16
        if device_state["trainer_device"] == "cuda"
        else torch.float32
    )

    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        torch_dtype=torch_dtype,
    )

    target_modules = config.get("target_modules") or infer_target_modules(model, torch)
    if not target_modules:
        raise RuntimeError("Could not infer LoRA target modules for the selected base model.")

    lora_config = LoraConfig(
        r=int(config.get("lora_r", 16)),
        lora_alpha=int(config.get("lora_alpha", 32)),
        lora_dropout=float(config.get("lora_dropout", 0.05)),
        target_modules=target_modules,
        task_type="CAUSAL_LM",
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    data_files = {"train": args.dataset}
    if args.validation:
        data_files["validation"] = args.validation

    raw_dataset = load_dataset("json", data_files=data_files)
    train_columns = raw_dataset["train"].column_names

    tokenized_dataset = raw_dataset.map(
        lambda example: tokenize_example(example, tokenizer, max_seq_length),
        remove_columns=train_columns,
    )

    training_args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=float(config.get("num_train_epochs", 1)),
        per_device_train_batch_size=int(config.get("per_device_train_batch_size", 1)),
        gradient_accumulation_steps=int(config.get("gradient_accumulation_steps", 8)),
        learning_rate=float(config.get("learning_rate", 2e-4)),
        logging_steps=int(config.get("logging_steps", 5)),
        save_strategy="epoch",
        eval_strategy="epoch" if args.validation else "no",
        fp16=device_state["trainer_device"] == "cuda" and not torch.cuda.is_bf16_supported(),
        bf16=device_state["trainer_device"] == "cuda" and torch.cuda.is_bf16_supported(),
        report_to="none",
        remove_unused_columns=False,
        save_total_limit=1,
        use_cpu=device_state["trainer_device"] == "cpu",
        do_train=True,
        do_eval=bool(args.validation),
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
        train_dataset=tokenized_dataset["train"],
        eval_dataset=tokenized_dataset["validation"] if args.validation else None,
        processing_class=tokenizer,
    )

    train_result = trainer.train()
    eval_metrics = trainer.evaluate() if args.validation else {}

    trainer.model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    final_train_loss = None
    if train_result.training_loss is not None:
        final_train_loss = float(train_result.training_loss)
    if final_train_loss is None:
        final_train_loss = extract_last_metric(trainer.state.log_history, "loss")
    final_eval_loss = extract_last_metric(trainer.state.log_history, "eval_loss")
    if final_eval_loss is None and "eval_loss" in eval_metrics:
        try:
            final_eval_loss = float(eval_metrics["eval_loss"])
        except Exception:
            final_eval_loss = None

    metadata = build_training_metadata(
        config=config,
        adapter_name=adapter_name,
        base_model=base_model,
        dataset_path=args.dataset,
        validation_path=args.validation,
        dataset_name=args.dataset_name,
        dataset_id=args.dataset_id,
        training_example_count=training_example_count,
        validation_example_count=validation_example_count,
        targeted_failure_modes=[item.strip() for item in (args.targeted_failure_modes or "").split(",") if item.strip()],
        is_mock_training=False,
        device=str(device_state["device"]),
        cuda_available=bool(device_state["cudaAvailable"]),
        started_at=started_at,
        completed_at=datetime.now(timezone.utc).isoformat(),
        training_duration_seconds=time.time() - started_at_seconds,
        final_train_loss=final_train_loss,
        final_eval_loss=final_eval_loss,
        notes=args.notes,
    )
    metadata_path = write_training_metadata(output_dir, metadata)

    print(f"Saved real adapter to {output_dir}")
    print(f"Training metadata: {metadata_path}")


if __name__ == "__main__":
    main()
