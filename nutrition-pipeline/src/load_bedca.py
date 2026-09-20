"""Carga cruda de BEDCA (bedca_foods.csv): 1 fila por alimento, con pares
valor+unidad por componente. Sin transformar nada todavía (eso es normalize.py).

Aviso importante: el código EuroFIR del sodio es literalmente el texto "NA",
y por defecto pandas confunde ese texto con "valor vacío". Se desactiva esa
detección automática (keep_default_na=False) y solo la cadena vacía cuenta
como valor ausente, para no perder la columna de sodio ni ningún otro dato.
"""
import pandas as pd

from config import RAW_DIR

BEDCA_FOODS_CSV = RAW_DIR / "bedca" / "bedca_foods.csv"


def load_bedca_foods() -> pd.DataFrame:
    df = pd.read_csv(
        BEDCA_FOODS_CSV,
        encoding="utf-8-sig",
        keep_default_na=False,
        na_values=[""],
    )
    return df
