import importlib.util
import json
import platform
import sys
from typing import Dict


CORE_MODULES = ["torch", "transformers", "datasets", "peft", "yaml", "accelerate"]
OPTIONAL_MODULES = ["trl", "bitsandbytes", "fastapi", "uvicorn"]


def has_module(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def inspect_modules() -> Dict[str, bool]:
    modules: Dict[str, bool] = {}
    for name in CORE_MODULES + OPTIONAL_MODULES:
        modules[name] = has_module(name)
    return modules


def inspect_torch_state(modules: Dict[str, bool]) -> Dict[str, object]:
    state: Dict[str, object] = {
        "torchAvailable": False,
        "torchVersion": None,
        "cudaAvailable": False,
        "cudaDeviceName": None,
    }

    if not modules.get("torch"):
        return state

    try:
        import torch  # type: ignore

        state["torchAvailable"] = True
        state["torchVersion"] = getattr(torch, "__version__", None)
        cuda_available = bool(torch.cuda.is_available())
        state["cudaAvailable"] = cuda_available
        if cuda_available:
            try:
                state["cudaDeviceName"] = torch.cuda.get_device_name(0)
            except Exception:
                state["cudaDeviceName"] = "unknown"
    except Exception as error:
        state["torchImportError"] = str(error)

    return state


def recommend_training_mode(modules: Dict[str, bool], torch_state: Dict[str, object]) -> str:
    missing_core = [name for name in CORE_MODULES if not modules.get(name)]
    if missing_core:
        return "cpu_mock_only"

    if bool(torch_state.get("cudaAvailable")):
        return "cuda_lora_training_possible"

    if bool(torch_state.get("torchAvailable")):
        return "cpu_tiny_training_possible"

    return "cloud_recommended"


def build_environment_report() -> Dict[str, object]:
    modules = inspect_modules()
    torch_state = inspect_torch_state(modules)
    return {
        "pythonVersion": platform.python_version(),
        "platform": platform.platform(),
        "modules": modules,
        "torch": torch_state,
        "recommendedTrainingMode": recommend_training_mode(modules, torch_state),
    }


def main() -> None:
    report = build_environment_report()
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
