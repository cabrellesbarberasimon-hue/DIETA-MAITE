"""Exporta la biblioteca a CSV y Excel: foods_master, foods_preferred y un
informe de validación, tal como se pidió en el punto 18."""
import pandas as pd

from schema import MASTER_COLUMNS


def _config_rows(config: dict) -> pd.DataFrame:
    rows = []

    def walk(prefix: str, value):
        if isinstance(value, dict):
            for k, v in value.items():
                walk(f"{prefix}.{k}" if prefix else k, v)
        else:
            rows.append({"clave": prefix, "valor": value})

    walk("", config)
    return pd.DataFrame(rows)


def export_csv(df: pd.DataFrame, output_dir, filename: str):
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / filename
    df.to_csv(path, index=False, encoding="utf-8-sig")
    return path


def export_master_excel(df: pd.DataFrame, output_dir, config: dict, filename: str = "foods_master.xlsx"):
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / filename

    preferred = df[df["preferred_record"] == True]  # noqa: E712
    dup_counts = df.groupby("duplicate_group_id")["internal_id"].transform("count")
    duplicates = df[dup_counts > 1].sort_values("duplicate_group_id")
    validation_issues = df[df["validation_status"] != "OK"].sort_values("validation_status")
    sources = df.groupby("source").size().reset_index(name="total")

    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="MASTER", index=False)
        preferred.to_excel(writer, sheet_name="PREFERRED", index=False)
        duplicates.to_excel(writer, sheet_name="DUPLICATES", index=False)
        validation_issues.to_excel(writer, sheet_name="VALIDATION", index=False)
        sources.to_excel(writer, sheet_name="SOURCES", index=False)
        _config_rows(config).to_excel(writer, sheet_name="CONFIG", index=False)

    return path


def export_validation_report(df: pd.DataFrame, output_dir, filename: str = "validation_report.xlsx"):
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / filename

    total = len(df)
    by_status = df["validation_status"].value_counts().reindex(["OK", "REVIEW", "ERROR"], fill_value=0)
    summary = pd.DataFrame(
        {
            "estado": by_status.index,
            "total": by_status.values,
            "porcentaje": (by_status.values / total * 100).round(1) if total else 0,
        }
    )

    key_fields = [c for c in MASTER_COLUMNS if c.endswith("_100g")]
    incompletitud = []
    for field in key_fields:
        missing = df[field].isna().sum()
        incompletitud.append({"campo": field, "faltantes": missing, "pct_faltante": round(missing / total * 100, 1) if total else 0})
    incompletitud_df = pd.DataFrame(incompletitud).sort_values("pct_faltante", ascending=False)

    errors = df[df["validation_status"] == "ERROR"]
    reviews = df[df["validation_status"] == "REVIEW"]

    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        summary.to_excel(writer, sheet_name="SUMMARY", index=False)
        incompletitud_df.to_excel(writer, sheet_name="MISSING_FIELDS", index=False)
        errors.to_excel(writer, sheet_name="ERRORS", index=False)
        reviews.to_excel(writer, sheet_name="REVIEW", index=False)

    return path
