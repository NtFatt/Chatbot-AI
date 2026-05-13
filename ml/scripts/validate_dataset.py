import json
import argparse
import sys

def main():
    parser = argparse.ArgumentParser(description="Validate JSONL dataset format")
    parser.add_argument("dataset", type=str, help="Path to JSONL dataset")
    args = parser.parse_args()

    try:
        with open(args.dataset, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f"Error: File {args.dataset} not found")
        sys.exit(1)

    if not lines:
        print("Error: Dataset is empty")
        sys.exit(1)

    errors = 0
    for i, line in enumerate(lines):
        try:
            data = json.loads(line)
        except json.JSONDecodeError as e:
            print(f"Line {i+1}: Invalid JSON - {e}")
            errors += 1
            continue

        if "messages" not in data:
            print(f"Line {i+1}: Missing 'messages' key")
            errors += 1
            continue

        messages = data["messages"]
        if not isinstance(messages, list):
            print(f"Line {i+1}: 'messages' must be a list")
            errors += 1
            continue

        for m in messages:
            if not isinstance(m, dict):
                print(f"Line {i+1}: Message item must be a dict")
                errors += 1
                continue
            if "role" not in m or "content" not in m:
                print(f"Line {i+1}: Message must have 'role' and 'content' keys")
                errors += 1

    if errors > 0:
        print(f"Validation failed with {errors} errors")
        sys.exit(1)
    else:
        print(f"Validation passed for {len(lines)} examples")

if __name__ == "__main__":
    main()
