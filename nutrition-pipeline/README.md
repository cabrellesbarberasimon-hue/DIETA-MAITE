# Biblioteca maestra de alimentos

Pipeline reproducible que construye una biblioteca nutricional única,
limpia y trazable a partir de varias bases de composición de alimentos.

**Estado actual: BEDCA (España, alimentos genéricos) + Open Food Facts
(productos de marca, de momento Mercadona/Hacendado).** Ciqual y USDA
quedaron descartados por ahora (ver decisión en la conversación): añadirlos
más adelante es posible sin rehacer nada, ya que la prioridad de fuentes y
los campos `source` ya están preparados para ello. Para añadir más marcas
(Lidl, Aldi, Carrefour, Prozis...), basta con dejar más exports de Open
Food Facts (TSV/CSV, uno por marca) en `data/raw/openfoodfacts/`: el
pipeline los recoge todos automáticamente.

## Cómo funciona

```
data/raw/bedca/            ficheros originales de BEDCA, verbatim (ver atribución abajo)
data/raw/openfoodfacts/    exports de Open Food Facts (uno o más .tsv/.csv, uno por marca)
data/processed/            (reservado para pasos intermedios futuros)
output/                    foods_master.csv/.xlsx, foods_preferred.csv, validation_report.xlsx
src/
  config.py          carga config.json
  schema.py          columnas de la biblioteca maestra
  text_utils.py      normalización de texto, detección de estado (crudo/cocido/...), plurales
  units.py           conversión de unidades compartida (masa, energía)
  load_bedca.py      lectura cruda de bedca_foods.csv
  load_off.py        lectura cruda de un export de Open Food Facts
  normalize.py       mapeo BEDCA -> esquema maestro
  normalize_off.py   mapeo Open Food Facts -> esquema maestro (source=FABRICANTE)
  deduplicate.py     agrupación de equivalencias (nombre + estado + composición) + preferred_record
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
- **Deduplicación** por nombre normalizado + estado + composición
  nutricional parecida (kcal/proteína/carbohidratos/grasa redondeados) —
  no basta con que coincida el nombre: p. ej. Mercadona repite nombres
  genéricos como "Filete de pechuga" en decenas de productos de peso
  variable con códigos de barras distintos; solo se agrupan si además
  tienen la misma composición.
- **Open Food Facts**: solo se usan los valores "packaging.as_sold" (lo
  que declara la propia etiqueta), nunca la estimación por IA/OCR de Open
  Food Facts — no es un dato "de la fuente", es una inferencia de
  terceros. Salt/sodio: si Open Food Facts ya trae ambos, se respetan tal
  cual; si falta uno de los dos, se calcula el que falta (marcado).
- Un alimento **sin nombre en ningún idioma** se marca como error de
  validación y nunca se agrupa por casualidad con otros alimentos sin
  nombre (se detectó y evitó este caso en Open Food Facts).

## Atribución de las fuentes

**BEDCA**: AESAN/BEDCA Base de Datos Española de Composición de Alimentos
v1.0 (2010), vía el dataset republicado en
<https://github.com/TerjeRu/bedca-database> (ver
`data/raw/bedca/SOURCE_README.md` y `SOURCE_LICENSE.txt`). Uso personal /
no comercial, tal como exigen las condiciones de BEDCA.

**Open Food Facts**: datos aportados por la comunidad de
[Open Food Facts](https://world.openfoodfacts.org), licencia Open Database
License (ODbL) — cualquier redistribución debe atribuir a Open Food Facts
y mantener la misma licencia en los datos derivados.
