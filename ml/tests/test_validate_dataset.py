import importlib.util
import pathlib
import unittest


MODULE_PATH = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "validate_dataset.py"
MODULE_SPEC = importlib.util.spec_from_file_location("validate_dataset", MODULE_PATH)
validate_dataset = importlib.util.module_from_spec(MODULE_SPEC)
assert MODULE_SPEC and MODULE_SPEC.loader
MODULE_SPEC.loader.exec_module(validate_dataset)


class ValidateDatasetTests(unittest.TestCase):
    def test_valid_hf_chat_jsonl_passes(self):
        errors = validate_dataset.validate_dataset_lines(
            [
                '{"messages":[{"role":"system","content":"Bạn là trợ lý học tập."},{"role":"user","content":"Giải thích OOP"},{"role":"assistant","content":"OOP là..."}]}'
            ]
        )

        self.assertEqual(errors, [])

    def test_missing_messages_fails(self):
        errors = validate_dataset.validate_dataset_lines(['{"prompt":"hello"}'])

        self.assertIn("Line 1: Missing 'messages' key", errors)

    def test_missing_assistant_response_fails(self):
        errors = validate_dataset.validate_dataset_lines(
            ['{"messages":[{"role":"user","content":"Giải thích kế thừa"}]}']
        )

        self.assertIn("Line 1: Missing assistant response", errors)

    def test_invalid_jsonl_fails(self):
        errors = validate_dataset.validate_dataset_lines(['{"messages": [}'])

        self.assertTrue(any(error.startswith("Line 1: Invalid JSON") for error in errors))

    def test_empty_dataset_fails(self):
        errors = validate_dataset.validate_dataset_lines([])

        self.assertEqual(errors, ["Error: Dataset is empty"])

    def test_vietnamese_unicode_remains_valid(self):
        errors = validate_dataset.validate_dataset_lines(
            [
                '{"messages":[{"role":"system","content":"Bạn là gia sư."},{"role":"user","content":"Giải thích đóng gói trong Java"},{"role":"assistant","content":"Đóng gói giúp bảo vệ dữ liệu nội bộ."}]}'
            ]
        )

        self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
