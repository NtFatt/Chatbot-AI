import argparse
import json
import sys
from typing import Iterable, List


def build_prompt_key(messages: object) -> str:
    if not isinstance(messages, list):
        return ""

    parts: List[str] = []
    for message in messages:
        if not isinstance(message, dict):
            continue
        role = message.get("role")
        content = message.get("content")
        if role == "assistant" or not isinstance(content, str):
            continue
        normalized = " ".join(content.strip().split())
        if normalized:
            parts.append(f"{role}:{normalized.lower()}")

    return "\n".join(parts)


def validate_messages(messages: object, line_number: int) -> List[str]:
    errors: List[str] = []

    if not isinstance(messages, list) or len(messages) == 0:
        return [f"Line {line_number}: 'messages' must be a non-empty list"]

    assistant_count = 0
    for message in messages:
        if not isinstance(message, dict):
            errors.append(f"Line {line_number}: Message item must be a dict")
            continue

        role = message.get("role")
        content = message.get("content")

        if role not in {"system", "user", "assistant"}:
            errors.append(f"Line {line_number}: Message role must be system, user, or assistant")

        if not isinstance(content, str) or len(content.strip()) == 0:
            errors.append(f"Line {line_number}: Message content must be a non-empty string")

        if role == "assistant" and isinstance(content, str) and len(content.strip()) > 0:
            assistant_count += 1

    if assistant_count == 0:
        errors.append(f"Line {line_number}: Missing assistant response")

    return errors


def validate_dataset_lines(lines: Iterable[str]) -> List[str]:
    normalized_lines = [line.rstrip("\n") for line in lines]
    if not normalized_lines:
        return ["Error: Dataset is empty"]

    errors: List[str] = []
    seen_prompt_keys = set()
    for index, line in enumerate(normalized_lines, start=1):
        stripped = line.strip()
        if not stripped:
            errors.append(f"Line {index}: Empty JSONL row")
            continue

        try:
            data = json.loads(stripped)
        except json.JSONDecodeError as error:
            errors.append(f"Line {index}: Invalid JSON - {error}")
            continue

        if "messages" not in data:
            errors.append(f"Line {index}: Missing 'messages' key")
            continue

        messages = data["messages"]
        errors.extend(validate_messages(messages, index))
        prompt_key = build_prompt_key(messages)
        if prompt_key:
            if prompt_key in seen_prompt_keys:
                errors.append(f"Line {index}: Duplicate prompt content")
            else:
                seen_prompt_keys.add(prompt_key)

    return errors


def validate_dataset_file(dataset_path: str) -> List[str]:
    try:
        with open(dataset_path, "r", encoding="utf-8") as file_handle:
            return validate_dataset_lines(file_handle.readlines())
    except FileNotFoundError:
        return [f"Error: File {dataset_path} not found"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate JSONL dataset format")
    parser.add_argument("dataset", type=str, help="Path to JSONL dataset")
    args = parser.parse_args()

    errors = validate_dataset_file(args.dataset)

    if errors:
        for error in errors:
            print(error)
        print(f"Validation failed with {len(errors)} errors")
        sys.exit(1)

    print(f"Validation passed for {sum(1 for _ in open(args.dataset, 'r', encoding='utf-8'))} examples")


if __name__ == "__main__":
    main()
