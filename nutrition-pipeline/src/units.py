"""Conversión de unidades compartida entre fuentes (masa y energía)."""
import pandas as pd

MASS_FACTORS_TO_GRAMS = {"g": 1.0, "mg": 1e-3, "ug": 1e-6, "µg": 1e-6, "mcg": 1e-6}


def is_missing(value) -> bool:
    return value is None or (isinstance(value, float) and pd.isna(value)) or value == ""


def convert_mass(value, source_unit, target_unit):
    if is_missing(value) or is_missing(source_unit):
        return None
    source_unit = str(source_unit).strip().lower()
    target_unit = str(target_unit).strip().lower()
    if source_unit == target_unit:
        return float(value)
    if source_unit not in MASS_FACTORS_TO_GRAMS or target_unit not in MASS_FACTORS_TO_GRAMS:
        return None
    grams = float(value) * MASS_FACTORS_TO_GRAMS[source_unit]
    return grams / MASS_FACTORS_TO_GRAMS[target_unit]


def convert_energy(value, unit, kj_per_kcal: float):
    """Devuelve (kcal, kj) a partir del valor y unidad de origen."""
    if is_missing(value) or is_missing(unit):
        return None, None
    unit = str(unit).strip().lower()
    value = float(value)
    if unit == "kcal":
        return value, value * kj_per_kcal
    if unit == "kj":
        return value / kj_per_kcal, value
    return None, None
