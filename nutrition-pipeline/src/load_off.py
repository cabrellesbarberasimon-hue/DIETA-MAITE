"""Carga cruda de un export de Open Food Facts (formato TSV moderno, con
columnas anidadas tipo `nutrition.input_sets.<conjunto>.100g.nutrients.<n>.value`).

Solo se usa el conjunto `packaging.as_sold` (lo que pone la propia etiqueta
del envase, "tal como se vende"): es un dato declarado, no una estimación.
El conjunto `estimate` (adivinado por OCR/IA de Open Food Facts) se ignora
a propósito — no es un valor "de la fuente", es una inferencia de terceros,
y la regla de "no inventar" pesa más que ganar cobertura.
"""
from pathlib import Path

import pandas as pd

NUTRIENT_SET_PREFIX = "nutrition.input_sets.packaging.as_sold.100g.nutrients."

NAME_LANG_PRIORITY = ["es", "en", "ca", "gl", "fr", "pt", "it", "de", "nl"]


def _nutrient_columns(header: list[str]) -> list[str]:
    return [c for c in header if c.startswith(NUTRIENT_SET_PREFIX)]


def load_off_export(path: Path) -> pd.DataFrame:
    with open(path, encoding="utf-8") as f:
        header = f.readline().rstrip("\n").split("\t")

    name_cols = [f"product_name_{lang}" for lang in NAME_LANG_PRIORITY if f"product_name_{lang}" in header]
    base_cols = [
        "code",
        "brands",
        "brands_tags",
        "categories_tags",
        "countries_tags",
        "quantity",
        "packaging",
    ]
    base_cols = [c for c in base_cols if c in header]
    nutrient_cols = _nutrient_columns(header)

    usecols = base_cols + name_cols + nutrient_cols
    df = pd.read_csv(
        path,
        sep="\t",
        usecols=usecols,
        dtype=str,
        keep_default_na=False,
        na_values=[""],
    )
    df.attrs["name_cols"] = name_cols
    df.attrs["nutrient_prefix"] = NUTRIENT_SET_PREFIX
    return df
