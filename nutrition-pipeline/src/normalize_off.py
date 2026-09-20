"""Normaliza un export de Open Food Facts al esquema maestro, como
source="FABRICANTE" / food_type="branded".

Solo se usan los valores "packaging.as_sold" (declarados en la propia
etiqueta), nunca los "estimate" (estimación por IA/OCR de Open Food Facts):
no son un dato "de la fuente", son una inferencia de terceros.
"""
from datetime import datetime, timezone

import pandas as pd

from load_off import NAME_LANG_PRIORITY, NUTRIENT_SET_PREFIX
from schema import MASTER_COLUMNS
from text_utils import build_search_tokens, detect_state, normalize_search_text
from units import convert_energy, convert_mass, is_missing

# (clave de nutriente en Open Food Facts, campo maestro, unidad objetivo)
NUTRIENT_MAP = [
    ("proteins", "protein_g_100g", "g"),
    ("carbohydrates", "carbohydrates_g_100g", "g"),
    ("sugars", "sugars_g_100g", "g"),
    ("added-sugars", "added_sugars_g_100g", "g"),
    ("starch", "starch_g_100g", "g"),
    ("fat", "fat_g_100g", "g"),
    ("saturated-fat", "saturated_fat_g_100g", "g"),
    ("monounsaturated-fat", "monounsaturated_fat_g_100g", "g"),
    ("polyunsaturated-fat", "polyunsaturated_fat_g_100g", "g"),
    ("trans-fat", "trans_fat_g_100g", "g"),
    ("fiber", "fiber_g_100g", "g"),
    ("sodium", "sodium_mg_100g", "mg"),
    ("salt", "salt_g_100g", "g"),
    ("cholesterol", "cholesterol_mg_100g", "mg"),
    ("water", "water_g_100g", "g"),
    ("alcohol", "alcohol_g_100g", "g"),
    ("calcium", "calcium_mg_100g", "mg"),
    ("iron", "iron_mg_100g", "mg"),
    ("magnesium", "magnesium_mg_100g", "mg"),
    ("phosphorus", "phosphorus_mg_100g", "mg"),
    ("potassium", "potassium_mg_100g", "mg"),
    ("zinc", "zinc_mg_100g", "mg"),
    ("copper", "copper_mg_100g", "mg"),
    ("manganese", "manganese_mg_100g", "mg"),
    ("selenium", "selenium_ug_100g", "ug"),
    ("fluoride", "fluoride_mg_100g", "mg"),
    ("vitamin-a", "vitamin_a_ug_100g", "ug"),
    ("vitamin-c", "vitamin_c_mg_100g", "mg"),
    ("vitamin-d", "vitamin_d_ug_100g", "ug"),
    ("vitamin-e", "vitamin_e_mg_100g", "mg"),
    ("vitamin-b1", "thiamine_mg_100g", "mg"),
    ("vitamin-b2", "riboflavin_mg_100g", "mg"),
    ("vitamin-b6", "vitamin_b6_mg_100g", "mg"),
    ("vitamin-b9", "folate_ug_100g", "ug"),
    ("vitamin-b12", "vitamin_b12_ug_100g", "ug"),
    ("vitamin-pp", "niacin_mg_100g", "mg"),
    ("alpha-linolenic-acid", "alpha_linolenic_acid_g_100g", "g"),
    ("arachidic-acid", "arachidic_acid_g_100g", "g"),
    ("oleic-acid", "oleic_acid_g_100g", "g"),
    ("lactose", "lactose_g_100g", "g"),
    ("polyols", "polyols_g_100g", "g"),
    ("choline", "choline_mg_100g", "mg"),
    ("caffeine", "caffeine_mg_100g", "mg"),
]


def _best_name(row: dict) -> tuple[str | None, str | None]:
    """Nombre preferido (según NAME_LANG_PRIORITY) y su idioma."""
    for lang in NAME_LANG_PRIORITY:
        value = row.get(f"product_name_{lang}")
        if not is_missing(value):
            return value, lang
    return None, None


def _category_from_tags(tags_value) -> tuple[str | None, str | None]:
    if is_missing(tags_value):
        return None, None
    tags = [t.strip() for t in str(tags_value).split(",") if t.strip()]
    tags = [t.split(":", 1)[-1].replace("-", " ") for t in tags]
    category = tags[-1] if tags else None
    subcategory = tags[-2] if len(tags) > 1 else None
    return category, subcategory


def normalize_off(df_raw: pd.DataFrame, config: dict, source_name: str = "FABRICANTE") -> pd.DataFrame:
    kj_per_kcal = config["kj_per_kcal"]
    energy_factors = config["energy_factors_kcal_per_g"]
    salt_factor = config["salt_from_sodium_factor"]
    state_keywords = config["state_keywords"]
    now = datetime.now(timezone.utc).isoformat()

    records = []
    for _, row in df_raw.iterrows():
        record: dict = {col: None for col in MASTER_COLUMNS}
        row_dict = row.to_dict()

        name, lang = _best_name(row_dict)
        name_es = row_dict.get("product_name_es")
        name_en = row_dict.get("product_name_en")

        record["food_name"] = name
        record["food_name_original"] = name
        record["food_name_es"] = name_es if not is_missing(name_es) else None
        record["food_name_en"] = name_en if not is_missing(name_en) else None
        record["food_name_normalized"] = normalize_search_text(name or "")

        record["source"] = source_name
        record["source_id"] = row_dict.get("code")
        record["country"] = "ES"
        record["language"] = lang or config["default_language"]
        record["food_type"] = "branded"
        record["reference_basis"] = "100g"
        # Un producto envasado se consume tal cual: se asume 100% comestible
        # (no hay concepto de "porción no comestible" como en un alimento crudo).
        record["edible_portion"] = 1.0

        brand = row_dict.get("brands")
        record["brand"] = brand if not is_missing(brand) else None
        record["barcode"] = row_dict.get("code")

        category, subcategory = _category_from_tags(row_dict.get("categories_tags"))
        record["category"] = category
        record["subcategory"] = subcategory

        record["state"] = detect_state(name or "", state_keywords)

        # ---- nutrientes: mapeo directo con conversión de unidades ----
        for off_key, field, target_unit in NUTRIENT_MAP:
            value = row_dict.get(f"{NUTRIENT_SET_PREFIX}{off_key}.value")
            unit = row_dict.get(f"{NUTRIENT_SET_PREFIX}{off_key}.unit")
            record[field] = convert_mass(value, unit, target_unit)

        # ---- energía ----
        kcal_raw = row_dict.get(f"{NUTRIENT_SET_PREFIX}energy-kcal.value")
        kcal_unit = row_dict.get(f"{NUTRIENT_SET_PREFIX}energy-kcal.unit")
        kj_raw = row_dict.get(f"{NUTRIENT_SET_PREFIX}energy-kj.value")
        kj_unit = row_dict.get(f"{NUTRIENT_SET_PREFIX}energy-kj.unit")

        kcal, kj = convert_energy(kcal_raw, kcal_unit, kj_per_kcal)
        if kcal is None:
            kcal, kj = convert_energy(kj_raw, kj_unit, kj_per_kcal)

        record["energy_calculated"] = False
        if kcal is None:
            protein = record["protein_g_100g"]
            carbs = record["carbohydrates_g_100g"]
            fat = record["fat_g_100g"]
            alcohol = record["alcohol_g_100g"]
            if not any(is_missing(v) for v in [protein, carbs, fat]):
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

        # ---- sal / sodio: Open Food Facts suele traer ambos directamente ----
        sodium_mg = record["sodium_mg_100g"]
        salt_g = record["salt_g_100g"]
        record["salt_calculated"] = False
        notes = []
        if is_missing(salt_g) and not is_missing(sodium_mg):
            record["salt_g_100g"] = round((sodium_mg * salt_factor) / 1000, 4)
            record["salt_calculated"] = True
        elif is_missing(sodium_mg) and not is_missing(salt_g):
            record["sodium_mg_100g"] = round((salt_g * 1000) / salt_factor, 2)
            notes.append("sodium_mg_100g calculado a partir de salt_g_100g (no venía en la fuente)")

        record["notes"] = " | ".join(notes) if notes else None

        # ---- búsqueda ----
        record["search_name"] = name
        alias_candidates = [v for v in [name_es, name_en] if not is_missing(v) and v != name]
        record["aliases"] = alias_candidates[0] if alias_candidates else None
        record["search_tokens"] = build_search_tokens(name or "", name_es or "", name_en or "", brand or "")

        record["created_at"] = now
        record["updated_at"] = now

        records.append(record)

    df = pd.DataFrame.from_records(records, columns=MASTER_COLUMNS)
    df["internal_id"] = [f"{source_name}-{sid}" for sid in df["source_id"]]
    return df
