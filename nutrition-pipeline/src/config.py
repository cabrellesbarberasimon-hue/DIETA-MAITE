"""Carga la configuración editable de config.json (prioridades, umbrales,
palabras clave de estado, etc.) sin valores importantes escondidos en el código."""
import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT_DIR / "config.json"
RAW_DIR = ROOT_DIR / "data" / "raw"
PROCESSED_DIR = ROOT_DIR / "data" / "processed"
OUTPUT_DIR = ROOT_DIR / "output"


def load_config() -> dict:
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)
