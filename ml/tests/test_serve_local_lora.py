import pathlib
import sys
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml" / "scripts"))

import serve_local_lora  # noqa: E402


class ServeLocalLoraTests(unittest.TestCase):
    def test_startup_arg_parser_accepts_adapter_and_model_aliases(self) -> None:
        args = serve_local_lora.build_startup_arg_parser().parse_args(
            ["--adapter", "ml/adapters/local-lora-tutor-v2", "--model", "local-lora-tutor-v2"]
        )

        self.assertEqual(args.adapter_dir, "ml/adapters/local-lora-tutor-v2")
        self.assertEqual(args.model_name, "local-lora-tutor-v2")

    def test_build_health_payload_reports_real_mode_fields(self) -> None:
        serve_local_lora.MOCK_MODE = False
        serve_local_lora.MODEL_NAME = "local-lora-tutor-v1"
        serve_local_lora.ADAPTER_LOADED = True
        serve_local_lora.MODEL = object()
        serve_local_lora.ADAPTER_PATH = "ml/adapters/local-lora-tutor-v1"
        serve_local_lora.TRAINING_METADATA_PATH = "ml/adapters/local-lora-tutor-v1/training-metadata.json"
        serve_local_lora.TRAINING_METADATA = {"baseModel": "HuggingFaceTB/SmolLM2-135M-Instruct", "isMockTraining": False}
        serve_local_lora.CUDA_AVAILABLE = False
        serve_local_lora.SERVING_DEVICE = "cpu"

        payload = serve_local_lora.build_health_payload()

        self.assertEqual(payload["mode"], "real")
        self.assertTrue(payload["adapterLoaded"])
        self.assertEqual(payload["adapterPath"], "ml/adapters/local-lora-tutor-v1")
        self.assertEqual(
            payload["trainingMetadataPath"],
            "ml/adapters/local-lora-tutor-v1/training-metadata.json",
        )
        self.assertEqual(payload["baseModel"], "HuggingFaceTB/SmolLM2-135M-Instruct")
        self.assertEqual(payload["device"], "cpu")
        self.assertFalse(payload["cudaAvailable"])


if __name__ == "__main__":
    unittest.main()
