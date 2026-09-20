"""Agrupa alimentos potencialmente equivalentes y marca un preferred_record
por grupo según la prioridad de fuentes.

Con una sola fuente (BEDCA) esto no debería agrupar casi nada (ya
comprobamos que no hay nombres duplicados exactos), pero la lógica está
pensada para cuando se añadan más fuentes: agrupa por nombre normalizado +
estado (crudo/cocido/...), nunca solo por parecido de texto.
"""
import pandas as pd

MACRO_SIGNATURE_FIELDS = ["kcal_100g", "protein_g_100g", "carbohydrates_g_100g", "fat_g_100g"]


def _macro_bucket(value) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return "NA"
    return str(round(float(value)))


def _group_key(row: pd.Series, match_fields: list[str]) -> str:
    name = str(row.get("food_name_normalized") or "").strip()
    if not name:
        # Sin nombre no hay forma fiable de saber si es "el mismo" alimento
        # que otro: cada uno queda en su propio grupo (nunca se agrupan por
        # casualidad solo por compartir un nombre vacío).
        return f"__sin_nombre__:{row.get('internal_id')}"
    base = "||".join(str(row.get(f) or "") for f in match_fields)
    macro_signature = "|".join(_macro_bucket(row.get(f)) for f in MACRO_SIGNATURE_FIELDS)
    return f"{base}||{macro_signature}"


def assign_duplicate_groups(df: pd.DataFrame, config: dict) -> pd.DataFrame:
    """Agrupa por nombre normalizado + estado + una composición nutricional
    parecida (kcal/proteína/carbohidratos/grasa redondeados). Coincidir solo
    en el nombre no basta: "Filete de pechuga" puede ser docenas de
    productos distintos con la misma etiqueta genérica pero recetas
    distintas (ver punto 10 del encargo)."""
    priority = config["source_priority"]
    match_fields = config["duplicate_match_fields"]

    def priority_rank(source: str) -> int:
        return priority.index(source) if source in priority else len(priority)

    df = df.copy()
    df["_group_key"] = df.apply(lambda row: _group_key(row, match_fields), axis=1)

    unique_keys = sorted(df["_group_key"].unique())
    group_id_map = {key: f"GRP-{i:05d}" for i, key in enumerate(unique_keys, start=1)}
    df["duplicate_group_id"] = df["_group_key"].map(group_id_map)

    df["preferred_record"] = False
    for _, group in df.groupby("_group_key"):
        ranked = group.assign(_rank=group["source"].map(priority_rank)).sort_values(
            ["_rank", "internal_id"]
        )
        df.loc[ranked.index[0], "preferred_record"] = True

    return df.drop(columns=["_group_key"])
