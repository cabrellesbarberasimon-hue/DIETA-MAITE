"""Agrupa alimentos potencialmente equivalentes y marca un preferred_record
por grupo según la prioridad de fuentes.

Con una sola fuente (BEDCA) esto no debería agrupar casi nada (ya
comprobamos que no hay nombres duplicados exactos), pero la lógica está
pensada para cuando se añadan más fuentes: agrupa por nombre normalizado +
estado (crudo/cocido/...), nunca solo por parecido de texto.
"""
import pandas as pd


def assign_duplicate_groups(df: pd.DataFrame, config: dict) -> pd.DataFrame:
    priority = config["source_priority"]
    match_fields = config["duplicate_match_fields"]

    def priority_rank(source: str) -> int:
        return priority.index(source) if source in priority else len(priority)

    df = df.copy()
    group_key = df[match_fields].fillna("").astype(str).agg("||".join, axis=1)
    df["_group_key"] = group_key

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
