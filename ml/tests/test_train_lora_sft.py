import pathlib
import sys
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml" / "scripts"))

from train_lora_sft import build_training_metadata, parse_args, render_messages_as_prompt  # noqa: E402


class FakeTokenizer:
    pass


class TrainLoraSftTests(unittest.TestCase):
    def test_parse_args_accepts_output_alias(self) -> None:
        args = parse_args(
            [
                "--dataset",
                "ml/datasets/train.jsonl",
                "--output",
                "ml/adapters/local-lora-tutor-v2",
                "--dataset-name",
                "DEV Curated L4 Tutor v2",
                "--dataset-id",
                "dataset-v2",
            ]
        )

        self.assertEqual(args.output_dir, "ml/adapters/local-lora-tutor-v2")
        self.assertEqual(args.dataset_name, "DEV Curated L4 Tutor v2")
        self.assertEqual(args.dataset_id, "dataset-v2")

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
            dataset_name="DEV Curated L4 Tutor v2",
            dataset_id="dataset-v2",
            training_example_count=24,
            validation_example_count=2,
            is_mock_training=False,
            device="cpu",
            cuda_available=False,
            started_at="2026-05-16T00:00:00+00:00",
            completed_at="2026-05-16T00:00:12+00:00",
            training_duration_seconds=12.34,
            final_train_loss=1.23,
            final_eval_loss=1.11,
            notes="LoRA SFT fine-tuning run.",
        )

        self.assertFalse(metadata["isMockTraining"])
        self.assertEqual(metadata["adapterName"], "local-lora-tutor-v1")
        self.assertEqual(metadata["datasetName"], "DEV Curated L4 Tutor v2")
        self.assertEqual(metadata["datasetId"], "dataset-v2")
        self.assertEqual(metadata["trainingExampleCount"], 24)
        self.assertEqual(metadata["validationExampleCount"], 2)
        self.assertEqual(metadata["finalTrainLoss"], 1.23)
        self.assertEqual(metadata["finalEvalLoss"], 1.11)
        self.assertEqual(metadata["startedAt"], "2026-05-16T00:00:00+00:00")
        self.assertEqual(metadata["completedAt"], "2026-05-16T00:00:12+00:00")


if __name__ == "__main__":
    unittest.main()
