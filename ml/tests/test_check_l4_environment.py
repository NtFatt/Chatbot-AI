import pathlib
import sys
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml" / "scripts"))

from check_l4_environment import recommend_training_mode  # noqa: E402


class CheckL4EnvironmentTests(unittest.TestCase):
    def test_recommends_mock_when_core_modules_are_missing(self) -> None:
        modules = {
            "torch": False,
            "transformers": False,
            "datasets": False,
            "peft": False,
            "yaml": False,
            "accelerate": False,
        }

        self.assertEqual(
            recommend_training_mode(modules, {"torchAvailable": False, "cudaAvailable": False}),
            "cpu_mock_only",
        )

    def test_recommends_cuda_training_when_cuda_is_available(self) -> None:
        modules = {
            "torch": True,
            "transformers": True,
            "datasets": True,
            "peft": True,
            "yaml": True,
            "accelerate": True,
        }

        self.assertEqual(
            recommend_training_mode(modules, {"torchAvailable": True, "cudaAvailable": True}),
            "cuda_lora_training_possible",
        )

    def test_recommends_cpu_training_when_core_modules_exist_without_cuda(self) -> None:
        modules = {
            "torch": True,
            "transformers": True,
            "datasets": True,
            "peft": True,
            "yaml": True,
            "accelerate": True,
        }

        self.assertEqual(
            recommend_training_mode(modules, {"torchAvailable": True, "cudaAvailable": False}),
            "cpu_tiny_training_possible",
        )


if __name__ == "__main__":
    unittest.main()
