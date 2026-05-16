import pathlib
import sys
import unittest
from asyncio import run as asyncio_run


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
        serve_local_lora.GENERATION_CONFIG = {"max_new_tokens": 64, "temperature": 0.2, "top_p": 0.9}
        serve_local_lora.CONTEXT_MAX_CHARS = 6000

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
        self.assertEqual(payload["generationConfig"], {"max_new_tokens": 64, "temperature": 0.2, "top_p": 0.9})
        self.assertEqual(payload["contextMaxChars"], 6000)

    def test_chat_completion_respects_max_new_tokens_alias(self) -> None:
        class FakeTensor(list):
            def to(self, _device: str):
                return self

        class FakeTokenizer:
            eos_token_id = 0

            def __call__(self, prompt: str, return_tensors: str = "pt", truncation: bool = False):
                self.last_prompt = prompt
                self.last_truncation = truncation
                return {"input_ids": FakeTensor([[1, 2, 3]])}

            def decode(self, _tokens, skip_special_tokens: bool = True) -> str:
                return "Câu trả lời ngắn."

        class FakeModel:
            device = "cuda"

            def generate(self, **kwargs):
                self.last_kwargs = kwargs
                return [[1, 2, 3, 4, 5]]

        serve_local_lora.MOCK_MODE = False
        serve_local_lora.MODEL = FakeModel()
        serve_local_lora.TOKENIZER = FakeTokenizer()
        serve_local_lora.GENERATION_CONFIG = {"max_new_tokens": 64, "temperature": 0.2, "top_p": 0.9}
        serve_local_lora.CONTEXT_MAX_CHARS = 200

        request = serve_local_lora.ChatCompletionRequest(
            model="local-lora-tutor-v3",
            messages=[serve_local_lora.Message(role="user", content="Giải thích OOP thật ngắn.")],
            max_new_tokens=32,
            temperature=0.1,
            top_p=0.8,
        )

        response = asyncio_run(serve_local_lora.chat_completions(request))

        self.assertEqual(response["choices"][0]["message"]["content"], "Câu trả lời ngắn.")
        self.assertEqual(serve_local_lora.MODEL.last_kwargs["max_new_tokens"], 32)
        self.assertEqual(serve_local_lora.MODEL.last_kwargs["temperature"], 0.1)
        self.assertEqual(serve_local_lora.MODEL.last_kwargs["top_p"], 0.8)
        self.assertTrue(serve_local_lora.TOKENIZER.last_truncation)


if __name__ == "__main__":
    unittest.main()
