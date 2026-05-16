import pathlib
import sys
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml" / "scripts"))

from train_lora_sft import build_training_metadata, render_messages_as_prompt  # noqa: E402


class FakeTokenizer:
    pass


class TrainLoraSftTests(unittest.TestCase):
    def test_render_messages_uses_safe_fallback_when_no_chat_template_exists(self) -> None:
        prompt = render_messages_as_prompt(
            [
                {"role": "system", "content": "Bạn là tutor."},
                {"role": "user", "content": "Giải thích OOP"},
            ],
            FakeTokenizer(),
        )

        self.assertIn("SYSTEM: Bạn là tutor.", prompt)
        self.assertIn("USER: Giải thích OOP", prompt)
        self.assertIn("ASSISTANT:", prompt)

    def test_build_training_metadata_marks_real_run_correctly(self) -> None:
        metadata = build_training_metadata(
            config={
                "num_train_epochs": 2,
                "learning_rate": 0.0002,
                "lora_r": 8,
                "lora_alpha": 16,
                "lora_dropout": 0.1,
                "max_seq_length": 512,
            },
            adapter_name="local-lora-tutor-v1",
            base_model="HuggingFaceTB/SmolLM2-135M-Instruct",
            dataset_path="ml/datasets/train.jsonl",
            validation_path="ml/datasets/val.jsonl",
            training_example_count=24,
            validation_example_count=2,
            is_mock_training=False,
            device="cpu",
            cuda_available=False,
            training_duration_seconds=12.34,
            final_train_loss=1.23,
            final_eval_loss=1.11,
        )

        self.assertFalse(metadata["isMockTraining"])
        self.assertEqual(metadata["adapterName"], "local-lora-tutor-v1")
        self.assertEqual(metadata["trainingExampleCount"], 24)
        self.assertEqual(metadata["validationExampleCount"], 2)
        self.assertEqual(metadata["finalTrainLoss"], 1.23)
        self.assertEqual(metadata["finalEvalLoss"], 1.11)


if __name__ == "__main__":
    unittest.main()
