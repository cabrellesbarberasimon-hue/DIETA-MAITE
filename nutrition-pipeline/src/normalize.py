"""Normaliza los alimentos crudos de BEDCA al esquema maestro: conversión de
unidades a un objetivo fijo por nutriente, energía en kJ/kcal, sal derivada
del sodio (marcada como calculada), omega3/omega6 sumados a partir de los
ácidos grasos individuales solo cuando están completos, y detección de
estado (crudo/cocido/...) por palabras clave en el nombre.

Regla de oro: si una fuente no trae un dato, se deja vacío. Nunca se
inventa ni se copia de un alimento parecido.
"""
from datetime import datetime, timezone

import pandas as pd

from schema import MASTER_COLUMNS
from text_utils import build_search_tokens, detect_state, normalize_search_text

MASS_FACTORS_TO_GRAMS = {"g": 1.0, "mg": 1e-3, "ug": 1e-6, "µg": 1e-6}

# (código BEDCA, campo maestro, unidad objetivo)
SIMPLE_MASS_MAP = [
    ("PROT", "protein_g_100g", "g"),
    ("CHO", "carbohydrates_g_100g", "g"),
    ("SUGAR", "sugars_g_100g", "g"),
    ("STARCH", "starch_g_100g", "g"),
    ("FAT", "fat_g_100g", "g"),
    ("FASAT", "saturated_fat_g_100g", "g"),
    ("FAMS", "monounsaturated_fat_g_100g", "g"),
    ("FAPU", "polyunsaturated_fat_g_100g", "g"),
    ("FATRS", "trans_fat_g_100g", "g"),
    ("FIBT", "fiber_g_100g", "g"),
    ("WATER", "water_g_100g", "g"),
    ("ALC", "alcohol_g_100g", "g"),
    ("NA", "sodium_mg_100g", "mg"),
    ("CHORL", "cholesterol_mg_100g", "mg"),
    ("CA", "calcium_mg_100g", "mg"),
    ("FE", "iron_mg_100g", "mg"),
    ("MG", "magnesium_mg_100g", "mg"),
    ("P", "phosphorus_mg_100g", "mg"),
    ("K", "potassium_mg_100g", "mg"),
    ("ZN", "zinc_mg_100g", "mg"),
    ("CU", "copper_mg_100g", "mg"),
    ("ID", "iodine_ug_100g", "ug"),
    ("SE", "selenium_ug_100g", "ug"),
    ("VITA", "vitamin_a_ug_100g", "ug"),
    ("VITC", "vitamin_c_mg_100g", "mg"),
    ("VITD", "vitamin_d_ug_100g", "ug"),
    ("VITE", "vitamin_e_mg_100g", "mg"),
    ("VITB6", "vitamin_b6_mg_100g", "mg"),
    ("VITB12", "vitamin_b12_ug_100g", "ug"),
    ("FOL", "folate_ug_100g", "ug"),
    ("THIA", "thiamine_mg_100g", "mg"),
    ("RIBF", "riboflavin_mg_100g", "mg"),
    ("NIAEQ", "niacin_mg_100g", "mg"),
    ("PANTAC", "pantothenic_acid_mg_100g", "mg"),
    ("BIOT", "biotin_ug_100g", "ug"),
    ("SUCS", "sucrose_g_100g", "g"),
    ("F12:0", "lauric_acid_g_100g", "g"),
    ("F14:0", "myristic_acid_g_100g", "g"),
    ("F16:0", "palmitic_acid_g_100g", "g"),
    ("F18:0", "stearic_acid_g_100g", "g"),
    ("F18:1CN9", "oleic_acid_g_100g", "g"),
    ("F18:2", "linoleic_acid_g_100g", "g"),
    ("F18:3", "alpha_linolenic_acid_g_100g", "g"),
    ("F20:4N6", "arachidonic_acid_g_100g", "g"),
    ("F20:5", "epa_g_100g", "g"),
    ("F22:6N3", "dha_g_100g", "g"),
]

OMEGA3_FIELDS = ["alpha_linolenic_acid_g_100g", "epa_g_100g", "dha_g_100g"]
OMEGA6_FIELDS = ["linoleic_acid_g_100g", "arachidonic_acid_g_100g"]


def _is_missing(value) -> bool:
    return value is None or (isinstance(value, float) and pd.isna(value)) or value == ""


def convert_mass(value, source_unit, target_unit):
    if _is_missing(value):
        return None
    if _is_missing(source_unit):
        return None
    source_unit = str(source_unit).strip()
    target_unit = str(target_unit).strip()
    if source_unit == target_unit:
        return float(value)
    if source_unit not in MASS_FACTORS_TO_GRAMS or target_unit not in MASS_FACTORS_TO_GRAMS:
        return None
    grams = float(value) * MASS_FACTORS_TO_GRAMS[source_unit]
    return grams / MASS_FACTORS_TO_GRAMS[target_unit]


def convert_energy(value, unit, kj_per_kcal: float):
    """Devuelve (kcal, kj) a partir del valor y unidad de origen."""
    if _is_missing(value) or _is_missing(unit):
        return None, None
    unit = str(unit).strip().lower()
    value = float(value)
    if unit == "kcal":
        return value, value * kj_per_kcal
    if unit == "kj":
        return value / kj_per_kcal, value
    return None, None


def _sum_if_complete(row: dict, fields: list[str]) -> float | None:
    values = [row.get(f) for f in fields]
    if any(_is_missing(v) for v in values):
        return None
    return round(sum(values), 4)


def normalize_bedca(df_raw: pd.DataFrame, config: dict) -> pd.DataFrame:
    kj_per_kcal = config["kj_per_kcal"]
    energy_factors = config["energy_factors_kcal_per_g"]
    salt_factor = config["salt_from_sodium_factor"]
    state_keywords = config["state_keywords"]
    now = datetime.now(timezone.utc).isoformat()

    records = []
    for _, row in df_raw.iterrows():
        record: dict = {col: None for col in MASTER_COLUMNS}

        name_es = row.get("f_ori_name")
        name_en = row.get("f_eng_name")
        record["food_name_original"] = name_es
        record["food_name_es"] = name_es
        record["food_name_en"] = name_en
        record["food_name"] = name_es if not _is_missing(name_es) else name_en
        record["food_name_normalized"] = normalize_search_text(record["food_name"] or "")
        record["sci_name"] = row.get("sci_name") if not _is_missing(row.get("sci_name")) else None

        record["source"] = "BEDCA"
        record["source_id"] = str(row.get("f_id"))
        record["country"] = "ES"
        record["language"] = config["default_language"]
        record["food_type"] = "generic"
        record["reference_basis"] = "100g"

        category = row.get("namelevel1")
        subcategory = row.get("namelevel2")
        record["category"] = category if not _is_missing(category) else None
        record["subcategory"] = subcategory if not _is_missing(subcategory) else None

        edible_portion = row.get("edible_portion")
        record["edible_portion"] = float(edible_portion) if not _is_missing(edible_portion) else None

        record["state"] = detect_state(record["food_name"] or "", state_keywords)

        f_origen = row.get("f_origen")
        notes = []
        if not _is_missing(f_origen) and f_origen != "BEDCA":
            notes.append(f"f_origen original: {f_origen}")
        record["notes"] = " | ".join(notes) if notes else None

        langual = row.get("langual")
        record["langual_codes"] = langual if not _is_missing(langual) else None

        # ---- nutrientes: mapeo directo con conversión de unidades ----
        for code, field, target_unit in SIMPLE_MASS_MAP:
            value = row.get(code)
            unit = row.get(f"{code}_unit")
            record[field] = convert_mass(value, unit, target_unit)

        # ---- energía ----
        kcal, kj = convert_energy(row.get("ENERC"), row.get("ENERC_unit"), kj_per_kcal)
        record["energy_calculated"] = False
        if kcal is None:
            protein = record["protein_g_100g"]
            carbs = record["carbohydrates_g_100g"]
            fat = record["fat_g_100g"]
            alcohol = record["alcohol_g_100g"]
            if not any(_is_missing(v) for v in [protein, carbs, fat]):
                alcohol_kcal = (alcohol or 0) * energy_factors["alcohol"]
                kcal = (
                    protein * energy_factors["protein"]
                    + carbs * energy_factors["carbohydrates"]
                    + fat * energy_factors["fat"]
                    + alcohol_kcal
                )
                kj = kcal * kj_per_kcal
                record["energy_calculated"] = True
        record["kcal_100g"] = round(kcal, 2) if kcal is not None else None
        record["kj_100g"] = round(kj, 2) if kj is not None else None

        # ---- omega 3 / omega 6 (solo si todos los sumandos existen) ----
        record["omega3_g_100g"] = _sum_if_complete(record, OMEGA3_FIELDS)
        record["omega6_g_100g"] = _sum_if_complete(record, OMEGA6_FIELDS)

        # ---- sal a partir de sodio (BEDCA no da sal) ----
        sodium_mg = record["sodium_mg_100g"]
        if not _is_missing(sodium_mg):
            record["salt_g_100g"] = round((sodium_mg * salt_factor) / 1000, 4)
            record["salt_calculated"] = True
        else:
            record["salt_g_100g"] = None
            record["salt_calculated"] = False

        # ---- búsqueda ----
        record["search_name"] = record["food_name"]
        record["search_tokens"] = build_search_tokens(name_es or "", name_en or "")
        record["aliases"] = name_en if (name_en and name_en != name_es) else None

        record["created_at"] = now
        record["updated_at"] = now

        records.append(record)

    df = pd.DataFrame.from_records(records, columns=MASTER_COLUMNS)
    df["internal_id"] = [f"BEDCA-{sid}" for sid in df["source_id"]]
    return df
