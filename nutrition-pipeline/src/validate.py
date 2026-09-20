"""Controles de coherencia (valores imposibles) y una puntuación de calidad
interna (0-100). La puntuación es solo una herramienta de trabajo, no un
criterio científico.
"""
import pandas as pd


def _present(value) -> bool:
    return value is not None and not (isinstance(value, float) and pd.isna(value))


def _expected_kcal_from_macros(row: dict, factors: dict) -> float | None:
    protein, carbs, fat = row.get("protein_g_100g"), row.get("carbohydrates_g_100g"), row.get("fat_g_100g")
    if not all(_present(v) for v in [protein, carbs, fat]):
        return None
    alcohol = row.get("alcohol_g_100g") or 0
    return protein * factors["protein"] + carbs * factors["carbohydrates"] + fat * factors["fat"] + alcohol * factors["alcohol"]


def _validate_row(row: dict, config: dict) -> tuple[str, list[str]]:
    v = config["validation"]
    errors: list[str] = []
    reviews: list[str] = []

    name = row.get("food_name")
    if not _present(name) or not str(name).strip():
        errors.append("sin nombre en ningún idioma disponible")

    macro_fields = [
        "protein_g_100g",
        "carbohydrates_g_100g",
        "sugars_g_100g",
        "fat_g_100g",
        "saturated_fat_g_100g",
        "fiber_g_100g",
    ]
    for field in macro_fields:
        value = row.get(field)
        if _present(value) and value > v["max_macro_g_100g"]:
            errors.append(f"{field}={value} supera {v['max_macro_g_100g']} g/100g")

    water = row.get("water_g_100g")
    if _present(water) and water > v["max_water_g_100g"]:
        errors.append(f"water_g_100g={water} supera {v['max_water_g_100g']}")

    alcohol = row.get("alcohol_g_100g")
    if _present(alcohol) and alcohol > v["max_alcohol_g_100g"]:
        errors.append(f"alcohol_g_100g={alcohol} supera {v['max_alcohol_g_100g']}")

    kcal = row.get("kcal_100g")
    if _present(kcal) and kcal < v["min_energy_kcal_100g"]:
        errors.append(f"kcal_100g negativa ({kcal})")
    if _present(kcal) and kcal > v["max_energy_kcal_100g"]:
        errors.append(f"kcal_100g={kcal} supera {v['max_energy_kcal_100g']} (posible error de unidad)")

    sodium = row.get("sodium_mg_100g")
    if _present(sodium) and sodium < 0:
        errors.append("sodium_mg_100g negativo")

    if not _present(kcal):
        reviews.append("sin energía (ni original ni calculable)")

    if not row.get("energy_calculated") and _present(kcal):
        factors = config["energy_factors_kcal_per_g"]
        expected = _expected_kcal_from_macros(row, factors)
        if expected is not None:
            diff_pct = abs(kcal - expected) / expected * 100 if expected > 0 else 0
            if diff_pct > v["macro_energy_tolerance_pct"] and abs(kcal - expected) > v["macro_energy_tolerance_min_kcal"]:
                reviews.append(
                    f"kcal declarada ({kcal:.0f}) se aleja de la estimada por macros ({expected:.0f}), {diff_pct:.0f}% de diferencia"
                )

    if errors:
        return "ERROR", errors
    if reviews:
        return "REVIEW", reviews
    return "OK", []


def _quality_score(row: dict, config: dict, validation_status: str) -> int:
    dq = config["data_quality"]
    key_fields = dq["key_fields"]
    present_ratio = sum(1 for f in key_fields if _present(row.get(f))) / len(key_fields)

    has_source_id = 1.0 if row.get("source_id") not in (None, "", "nan") else 0.0
    source_trust = config["source_trust_score"].get(row.get("source"), 50) / 100
    macro_coherence = 0.4 if validation_status == "REVIEW" and "kcal declarada" in " ".join(row.get("_review_reasons", [])) else 1.0
    state_clarity = 1.0 if row.get("state") else 0.0

    score = (
        present_ratio * dq["weight_key_fields_pct"]
        + has_source_id * dq["weight_has_source_id_pct"]
        + source_trust * dq["weight_source_trust_pct"]
        + macro_coherence * dq["weight_macro_coherence_pct"]
        + state_clarity * dq["weight_state_clarity_pct"]
    )
    if validation_status == "ERROR":
        score = min(score, 30)
    return round(score)


def validate(df, config: dict):
    statuses = []
    notes_list = []
    scores = []

    for _, row in df.iterrows():
        row_dict = row.to_dict()
        status, reasons = _validate_row(row_dict, config)
        row_dict["_review_reasons"] = reasons
        score = _quality_score(row_dict, config, status)

        statuses.append(status)
        notes_list.append(" | ".join(reasons) if reasons else None)
        scores.append(score)

    df = df.copy()
    df["validation_status"] = statuses
    df["validation_notes"] = notes_list
    df["data_quality_score"] = scores
    return df
