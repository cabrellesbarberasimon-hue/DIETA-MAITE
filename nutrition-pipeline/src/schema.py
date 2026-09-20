"""Definición de la biblioteca maestra de alimentos: columnas y orden.

Incluye las columnas mínimas pedidas más columnas extra para micronutrientes
que las fuentes traen y que no queremos perder (nunca se pierde un dato que
la fuente sí tenía).
"""

MASTER_COLUMNS = [
    # Identidad y trazabilidad
    "internal_id",
    "food_name",
    "food_name_original",
    "food_name_es",
    "food_name_en",
    "food_name_normalized",
    "sci_name",
    "langual_codes",
    "source",
    "source_id",
    "country",
    "language",
    "food_type",  # generic | branded | recipe | ingredient
    "category",
    "subcategory",
    "state",  # crudo, cocido, frito, ...
    "preparation",
    "edible_portion",
    "reference_basis",  # 100g | 100ml
    # Energía
    "kcal_100g",
    "kj_100g",
    "energy_calculated",
    # Macronutrientes
    "protein_g_100g",
    "carbohydrates_g_100g",
    "sugars_g_100g",
    "starch_g_100g",
    "fat_g_100g",
    "saturated_fat_g_100g",
    "monounsaturated_fat_g_100g",
    "polyunsaturated_fat_g_100g",
    "trans_fat_g_100g",
    "omega3_g_100g",
    "omega6_g_100g",
    "fiber_g_100g",
    "sodium_mg_100g",
    "salt_g_100g",
    "salt_calculated",
    "cholesterol_mg_100g",
    "water_g_100g",
    "alcohol_g_100g",
    # Minerales
    "calcium_mg_100g",
    "iron_mg_100g",
    "magnesium_mg_100g",
    "phosphorus_mg_100g",
    "potassium_mg_100g",
    "zinc_mg_100g",
    "copper_mg_100g",
    "iodine_ug_100g",
    "selenium_ug_100g",
    # Vitaminas
    "vitamin_a_ug_100g",
    "vitamin_c_mg_100g",
    "vitamin_d_ug_100g",
    "vitamin_e_mg_100g",
    "vitamin_b6_mg_100g",
    "vitamin_b12_ug_100g",
    "folate_ug_100g",
    "thiamine_mg_100g",
    "riboflavin_mg_100g",
    "niacin_mg_100g",
    "pantothenic_acid_mg_100g",
    "biotin_ug_100g",
    # Ácidos grasos individuales (trazabilidad de omega3/omega6)
    "lauric_acid_g_100g",
    "myristic_acid_g_100g",
    "palmitic_acid_g_100g",
    "stearic_acid_g_100g",
    "oleic_acid_g_100g",
    "linoleic_acid_g_100g",
    "alpha_linolenic_acid_g_100g",
    "arachidonic_acid_g_100g",
    "epa_g_100g",
    "dha_g_100g",
    # Comercial (preparado para FABRICANTE / Open Food Facts, vacío por ahora)
    "brand",
    "barcode",
    "package_size_g",
    "package_price",
    "price_per_kg",
    "price_per_100g",
    "cost_per_20g_protein",
    "cost_per_30g_protein",
    "protein_per_euro",
    # Búsqueda
    "search_name",
    "search_tokens",
    "aliases",
    # Calidad y deduplicación
    "data_quality_score",
    "preferred_record",
    "duplicate_group_id",
    "validation_status",
    "validation_notes",
    "notes",
    # Metadatos
    "created_at",
    "updated_at",
]

REQUIRED_NON_NULL = ["internal_id", "food_name", "source", "source_id"]
