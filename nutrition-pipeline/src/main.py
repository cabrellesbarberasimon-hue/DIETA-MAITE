"""Orquesta el proceso completo: cargar -> normalizar -> deduplicar ->
validar -> exportar, y muestra el informe final (punto 19)."""
import pandas as pd

from config import OUTPUT_DIR, PROCESSED_DIR, RAW_DIR, load_config
from deduplicate import assign_duplicate_groups
from export import export_csv, export_master_excel, export_validation_report
from load_bedca import load_bedca_foods
from load_off import load_off_export
from normalize import normalize_bedca
from normalize_off import normalize_off
from schema import MASTER_COLUMNS

OFF_RAW_DIR = RAW_DIR / "openfoodfacts"


def run() -> None:
    config = load_config()

    print("== Cargando fuentes ==")
    bedca_raw = load_bedca_foods()
    print(f"BEDCA: {len(bedca_raw)} alimentos con datos de composición")

    print("\n== Normalizando ==")
    bedca_normalized = normalize_bedca(bedca_raw, config)
    all_sources = {"BEDCA": len(bedca_normalized)}
    parts = [bedca_normalized]

    if OFF_RAW_DIR.exists():
        off_files = sorted(list(OFF_RAW_DIR.glob("*.tsv")) + list(OFF_RAW_DIR.glob("*.csv")))
        off_normalized_parts = []
        for off_file in off_files:
            off_raw = load_off_export(off_file)
            print(f"Open Food Facts ({off_file.name}): {len(off_raw)} productos")
            off_normalized_parts.append(normalize_off(off_raw, config))
        if off_normalized_parts:
            off_normalized = pd.concat(off_normalized_parts, ignore_index=True)
            off_normalized = off_normalized.drop_duplicates(subset=["source_id"], keep="first")
            all_sources["FABRICANTE (Open Food Facts)"] = len(off_normalized)
            parts.append(off_normalized)

    combined = pd.concat(parts, ignore_index=True)

    print("\n== Deduplicando ==")
    combined = assign_duplicate_groups(combined, config)

    print("\n== Validando ==")
    from validate import validate

    combined = validate(combined, config)

    print("\n== Exportando ==")
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    master_csv = export_csv(combined, OUTPUT_DIR, "foods_master.csv")
    preferred_df = combined[combined["preferred_record"] == True]  # noqa: E712
    preferred_csv = export_csv(preferred_df, OUTPUT_DIR, "foods_preferred.csv")
    master_xlsx = export_master_excel(combined, OUTPUT_DIR, config)
    validation_xlsx = export_validation_report(combined, OUTPUT_DIR)

    print(f"  {master_csv}")
    print(f"  {preferred_csv}")
    print(f"  {master_xlsx}")
    print(f"  {validation_xlsx}")

    _print_report(combined, all_sources)


def _print_report(df, all_sources: dict) -> None:
    total = len(df)
    duplicate_groups = df.groupby("duplicate_group_id").size()
    groups_with_dupes = duplicate_groups[duplicate_groups > 1]
    preferred = df[df["preferred_record"] == True]  # noqa: E712
    errors = df[df["validation_status"] == "ERROR"]
    reviews = df[df["validation_status"] == "REVIEW"]

    macro_fields = ["kcal_100g", "protein_g_100g", "carbohydrates_g_100g", "fat_g_100g"]
    complete_macros = df[macro_fields].notna().all(axis=1).sum()

    key_fields = [c for c in MASTER_COLUMNS if c.endswith("_100g")]
    missing_ratio = {f: df[f].isna().mean() for f in key_fields}
    most_incomplete = sorted(missing_ratio.items(), key=lambda kv: kv[1], reverse=True)[:5]

    print("\n================ INFORME FINAL ================")
    for source, count in all_sources.items():
        print(f"{source}: {count} registros")
    print(f"Total combinado: {total}")
    print(f"Grupos de equivalencia con más de un registro: {len(groups_with_dupes)}")
    print(f"Duplicados detectados (registros no preferidos dentro de un grupo): {total - len(preferred)}")
    print(f"Registros preferidos (foods_preferred): {len(preferred)}")
    print(f"Registros con error (validation_status=ERROR): {len(errors)}")
    print(f"Registros para revisar (validation_status=REVIEW): {len(reviews)}")
    print(f"% de registros con macros completos (kcal/prot/carb/grasa): {complete_macros / total * 100:.1f}%")
    print("Nutrientes más incompletos:")
    for field, ratio in most_incomplete:
        print(f"  {field}: {ratio * 100:.1f}% faltante")
    print("=================================================")


if __name__ == "__main__":
    run()
