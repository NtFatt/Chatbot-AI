import pathlib
import sys
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml" / "scripts"))

import serve_local_lora  # noqa: E402


class ServeLocalLoraTests(unittest.TestCase):
    def test_build_health_payload_reports_real_mode_fields(self) -> None:
        serve_local_lora.MOCK_MODE = False
        serve_local_lora.MODEL_NAME = "local-lora-tutor-v1"
        serve_local_lora.ADAPTER_LOADED = True
        serve_local_lora.MODEL = object()
        serve_local_lora.ADAPTER_PATH = "ml/adapters/local-lora-tutor-v1"
        serve_local_lora.CUDA_AVAILABLE = False

        payload = serve_local_lora.build_health_payload()

        self.assertEqual(payload["mode"], "real")
        self.assertTrue(payload["adapterLoaded"])
        self.assertEqual(payload["adapterPath"], "ml/adapters/local-lora-tutor-v1")
        self.assertFalse(payload["cudaAvailable"])


if __name__ == "__main__":
    unittest.main()
