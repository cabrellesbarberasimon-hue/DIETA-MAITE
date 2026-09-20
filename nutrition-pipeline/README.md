# Biblioteca maestra de alimentos

Pipeline reproducible que construye una biblioteca nutricional única,
limpia y trazable a partir de varias bases de composición de alimentos.

**Estado actual: solo BEDCA (España).** Open Food Facts (productos de
marca españoles, código de barras) está previsto como segunda fase, para
la columna `source = FABRICANTE`. Ciqual y USDA quedaron descartados por
ahora (ver decisión en la conversación): añadirlos más adelante es posible
sin rehacer nada, ya que la prioridad de fuentes y los campos `source`
ya están preparados para ello.

## Cómo funciona

```
data/raw/bedca/     ficheros originales de BEDCA, verbatim (ver atribución abajo)
data/processed/     (reservado para pasos intermedios futuros)
output/             foods_master.csv/.xlsx, foods_preferred.csv, validation_report.xlsx
src/
  config.py          carga config.json
  schema.py          columnas de la biblioteca maestra
  text_utils.py      normalización de texto, detección de estado (crudo/cocido/...)
  load_bedca.py      lectura cruda de bedca_foods.csv
  normalize.py       mapeo de campos + conversión de unidades al esquema maestro
  deduplicate.py     agrupación de equivalencias + preferred_record
  validate.py        controles de coherencia + data_quality_score
  export.py          CSV/Excel de salida
  main.py            orquesta todo el proceso
config.json          prioridad de fuentes, umbrales, palabras clave de estado — editable sin tocar código
```

## Ejecutar

```bash
cd nutrition-pipeline
pip install -r requirements.txt
python3 src/main.py
```

Vuelca `foods_master.csv/.xlsx`, `foods_preferred.csv` y
`validation_report.xlsx` en `output/`, y muestra un informe por consola
(totales por fuente, duplicados, calidad, % de macros completos,
nutrientes más incompletos).

## Reglas seguidas (resumen)

- **Nunca se inventa un dato.** Si una fuente no trae un nutriente, se deja
  vacío. Los únicos cálculos derivados son los explícitamente definidos:
  conversión de unidades, sal a partir de sodio (`salt_calculated=TRUE`),
  energía a partir de macros solo si falta la original
  (`energy_calculated=TRUE`), y omega‑3/omega‑6 sumando ácidos grasos
  individuales solo cuando **todos** los sumandos existen.
- **Trazabilidad total**: `source`, `source_id` y el nombre original nunca
  se pierden ni se sobrescriben.
- **Estado del alimento** (crudo/cocido/frito/...) se detecta por palabras
  completas en el nombre (con límites de palabra, para evitar falsos
  positivos tipo "pasado" ≠ "asado"); si el nombre no da pistas, queda vacío.
- **Deduplicación** por nombre normalizado + estado, nunca por parecido de
  texto a secas; arquitectura lista para cruzar fuentes cuando se añada
  Open Food Facts.

## Atribución de BEDCA

**Fuente: AESAN/BEDCA Base de Datos Española de Composición de Alimentos
v1.0 (2010)**, vía el dataset republicado en
<https://github.com/TerjeRu/bedca-database> (ver
`data/raw/bedca/SOURCE_README.md` y `SOURCE_LICENSE.txt`). Uso personal /
no comercial, tal como exigen las condiciones de BEDCA.
