# NutriProgress

Aplicación web (mobile-first, PWA instalable) para el seguimiento diario de dieta y ejercicio. Admite **varias personas**, cada una con su propio plan, objetivos y peso, con supervisión y edición desde un panel de admin (Simón, nutricionista).

## Stack

- **Next.js 16** (App Router, Server Actions, TypeScript) — frontend y backend en el mismo proyecto.
- **PostgreSQL** vía **Prisma ORM 7** (migraciones versionadas en `prisma/migrations/`).
- **Autenticación propia**: email + contraseña, hash con `bcryptjs`, sesión en cookie httpOnly firmada con `jose` (JWT). El rol (`USUARIA` / `ADMIN`) se comprueba en el servidor (proxy + cada Server Action), no solo en el frontend.
- **Tailwind CSS 4** para un UI mobile-first.
- PWA: `manifest.json` + iconos, instalable en el móvil.

## Modelo de datos

- `User` — cualquier número de usuarias (`USUARIA`) más el/los admin (`ADMIN`).
- `Profile` — datos antropométricos y objetivos, uno por usuaria: **proteína/grasa objetivo constantes**, BMR/GET calculados automáticamente (Mifflin-St Jeor × factor de actividad, ver más abajo), objetivo principal, peso objetivo y % grasa objetivo (ambos opcionales), déficit por % o kcal manual.
- `DayType` — tipos de día definidos por usuaria (p. ej. "Entrenamiento", "Descanso"), cada uno con su propio objetivo de carbohidratos, y uno marcado como predeterminado.
- `DayLog` — qué `DayType` es cada fecha concreta, elegido a mano por la usuaria (editable también para días pasados). Si un día no tiene elección propia, se usa el predeterminado. El objetivo de kcal del día no se guarda: se calcula (proteína×4 + carbohidratos×4 + grasa×9).
- `DayPlan` / `PlannedMeal` — el menú planificado por día de la semana, independiente del tipo de día. Cada comida puede tener **varias opciones** (alternativas con kcal/macros parecidos); el desplegable para elegir solo aparece cuando ya hay 2 o más — con una sola opción se ve como texto plano. El admin gestiona las opciones una a una o las importa por Excel (columnas: día, comida, descripción, kcal, proteina_g, carbohidratos_g, grasas_g — añade opciones nuevas, nunca borra las existentes). La usuaria también puede guardar una comida libre como opción del plan con una casilla al registrarla, que además la manda a la biblioteca de platos (ver abajo).
- `MealTemplate` — **biblioteca de platos**, compartida entre todas las personas (independiente de `PlannedMeal`: solo se copian los valores al usarla). Se alimenta desde tres sitios: al crear una opción de comida a mano (admin), al importar un Excel (admin, con una versión que va directa a la biblioteca sin pasar por ninguna persona ni día), y al guardar una comida libre como opción del plan (usuaria) — en los tres casos con una casilla "guardar en la biblioteca". También se puede **buscar y reutilizar** desde el buscador de platos: el admin al planificar el menú de cualquier persona, y la propia usuaria al registrar una comida libre ("Otro alimento"). Panel propio en **Platos** para buscar/editar/borrar. Para el menú que ya existía antes de esta biblioteca, hay un botón en la ficha de cada persona → Plan ("Guardar los platos de este menú en la biblioteca") que copia lo que ya tiene planificado sin tener que volver a escribirlo.
- `MealLog` / `ExerciseLog` / `WeightLog` — comidas, ejercicio y peso realmente registrados, **editables/borrables cualquier día**, no solo hoy. El admin también puede editar y borrar las comidas que ya registró una usuaria (desde su ficha → **Historial** → un día concreto), para ajustarlas a sus macros al revisar el día o la semana; no toca el tipo de día (lo elige ella) ni el ejercicio/peso. Al corregir una comida que venía de una opción del plan (no una comida libre), tanto la usuaria como el admin pueden marcar "actualizar también esta opción del plan" para que la corrección quede fija ahí y no solo en ese registro — así la próxima vez que se elija esa opción ya sale bien.
- `Food` — tabla de composición compartida, con buscador con autocompletar; permite además introducir un alimento nuevo por sus valores por 100 g y guardarlo en la biblioteca. El admin tiene un panel propio (**Alimentos**) para gestionarla.
- `ExerciseType` — tabla MET compartida (Descanso, Paseo suave, Caminar rápido...).

### Macros y objetivos: qué se calcula solo

Por decisión explícita (no del Excel original): la proteína y la grasa objetivo son **siempre las mismas**, todos los días. Los carbohidratos cambian eligiendo un **tipo de día** cada fecha concreta (no una plantilla semanal fija). El BMR y el GET **no se introducen a mano**: al dar de alta a una persona (o editar su perfil) se eligen sexo/edad/altura/peso, un **objetivo principal** (reducir grasa, recomposición, ganar músculo, mantenimiento, rendimiento) y un **nivel de actividad** (Sedentario/Ligero/Moderado/Alto/Muy alto, o un factor personalizado), y de ahí salen solos:

- `BMR estimado` — fórmula de Mifflin-St Jeor.
- `GET estimado` — BMR × factor de actividad.
- `Presupuesto semanal` — (GET − déficit) × 7.

El déficit (o superávit) se elige por **porcentaje** (10/15/20/personalizado) o en **kcal manuales**; con el objetivo "Reducir grasa corporal" no se permite un déficit ≤ 0. Los perfiles que ya tenían BMR/GET puestos a mano (de antes de este cambio) conservan su valor tal cual — no se recalculan solos, hace falta pulsar "Recalcular" explícitamente desde el perfil.

### Buscador de alimentos

Al registrar una comida (o planificar el menú desde el admin) hay un buscador con desplegable de sugerencias sobre la tabla de composición de alimentos. Al elegir uno y poner los gramos, calcula kcal/macros solo y rellena el resto del formulario. Si el alimento no está, se pueden introducir sus valores por 100 g a mano, calcular el consumo por los gramos comidos, y opcionalmente guardarlo en la biblioteca para la próxima vez.

### Varias personas

Solo el admin puede dar de alta cuentas nuevas, desde **Personas → + Nueva** en su panel: nombre, email, contraseña, y los datos de perfil — BMR/GET/presupuesto salen solos, como se explica arriba. La cuenta nueva arranca con un menú semanal en blanco (7 días × 5 comidas, "Sin planificar") que el admin rellena después desde la ficha de esa persona → pestaña **Plan**. No hay auto-registro: solo el admin crea cuentas.

El panel de admin es un selector: **Personas** (lista con buscador, cada tarjeta mostrando objetivo/% grasa/peso/último control cuando existan) → ficha de cada persona con **Resumen** / **Historial** / **Plan**, más una sección global **Alimentos** para la biblioteca compartida.

Desde **Personas** también hay un botón para descargar una **copia de seguridad completa** (todas las tablas en un único JSON, sin las imágenes de peso por tamaño) — pensado para guardarla tú mismo de vez en cuando; no es un backup automático.

En la ficha de cada persona → **Resumen** hay dos botones para descargar un **informe en PDF** (últimos 7 o 30 días): macros medias frente a objetivo, cumplimiento, variación de peso y ejercicio — pensado para imprimir o mandar en una revisión.

## Desarrollo local

### 1. Requisitos

- Node.js 20+
- Una base de datos PostgreSQL (local, o una gratuita en Neon/Supabase/Railway)

### 2. Variables de entorno

Copia `.env.example` a `.env` y rellena:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL |
| `AUTH_SECRET` | Secreto para firmar las cookies de sesión (`openssl rand -base64 32`) |
| `SEED_MAITE_EMAIL` / `SEED_MAITE_PASSWORD` | Credenciales iniciales de Maite (usuaria) |
| `SEED_SIMON_EMAIL` / `SEED_SIMON_PASSWORD` | Credenciales iniciales de Simón (admin) |
| `SEED_TOKEN` | Solo en producción: autoriza `/api/admin/seed` (ver más abajo) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Par de claves para notificaciones push (recordatorios). Genera uno propio con `npx web-push generate-vapid-keys` |
| `CRON_SECRET` | Protege `/api/cron/recordatorios`; Vercel lo envía solo automáticamente si defines esta variable en el proyecto |
| `ANTHROPIC_API_KEY` | Habilita "Registrar por foto" (IA). Opcional: sin ella, ese botón simplemente no aparece |

### 3. Instalar dependencias

```bash
npm install
```

### 4. Migrar y poblar la base de datos

```bash
npx prisma migrate dev --name init   # crea las tablas
npx prisma db seed                   # carga prisma/seed-data/dieta_maite_seed.json
```

El seed crea a Maite y a Simón con las credenciales de `.env`, el perfil, los 7 días de menú planificado (con sus platos y objetivos) y la tabla MET de ejercicios.

### 5. Arrancar en desarrollo

```bash
npm run dev
```

Abre http://localhost:3000 — se redirige automáticamente a `/login`.

## Despliegue en producción

**Recomendado: Vercel (app) + Neon (base de datos PostgreSQL gestionada).** Supabase o Railway funcionan igual de bien; solo cambia de dónde sacas el `DATABASE_URL`.

1. **Crear la base de datos**: crea un proyecto en [Neon](https://neon.tech) (o Supabase/Railway) y copia la cadena de conexión PostgreSQL (con `sslmode=require`).
2. **Importar el proyecto en Vercel**: conecta el repositorio de GitHub en [vercel.com/new](https://vercel.com/new).
3. **Variables de entorno en Vercel** (Project Settings → Environment Variables):
   - `DATABASE_URL` — la cadena de conexión de Neon/Supabase/Railway.
   - `AUTH_SECRET` — un valor aleatorio largo (`openssl rand -base64 32`).
   - `TZ` — zona horaria de Maite, p. ej. `Europe/Madrid`. Importante: determina qué día es "hoy" para el registro diario y el cálculo del semáforo.
4. **Migraciones**: se aplican solas en cada deploy — el script `build` ejecuta `prisma migrate deploy` antes de `next build` (ver `package.json`). No hace falta ningún paso manual para esto.
5. **Deploy**: Vercel construye automáticamente. Una vez desplegado, tendrás una URL real (`https://tu-app.vercel.app`) a la que Maite y Simón pueden entrar desde el móvil y añadirla a la pantalla de inicio (PWA instalable).
6. **Sembrar los datos iniciales (una sola vez)**: las migraciones dejan las tablas creadas pero vacías. Añade estas variables de entorno más en Vercel:
   - `SEED_TOKEN` — un valor aleatorio largo, solo para autorizar el sembrado (`openssl rand -base64 32`).
   - `SEED_MAITE_PASSWORD` / `SEED_SIMON_PASSWORD` — las contraseñas reales de Maite y Simón.
   - (opcional) `SEED_MAITE_EMAIL` / `SEED_SIMON_EMAIL` si no quieres los emails de ejemplo.

   Redeploy, y visita una vez, desde el navegador:
   ```
   https://tu-app.vercel.app/api/admin/seed?token=<el valor de SEED_TOKEN>
   ```
   Debe responder `{"ok":true,...}`. Es idempotente (no pisa nada si lo visitas más de una vez) y no expone nada sin el token correcto. Después de usarlo puedes quitar `SEED_TOKEN` de Vercel si prefieres cerrar la puerta.

   Alternativa si prefieres hacerlo desde tu propio ordenador en vez de por URL:
   ```bash
   DATABASE_URL="<url-de-producción>" SEED_MAITE_PASSWORD="..." SEED_SIMON_PASSWORD="..." npx prisma db seed
   ```

### Recordatorios por notificación push

Si una usuaria no ha registrado ninguna comida en el día, la app puede avisarle con una notificación push del navegador (funciona con la PWA instalada o simplemente con la pestaña cerrada, mientras haya concedido el permiso una vez).

1. **Genera un par de claves VAPID** (una sola vez, no dependen de ninguna cuenta externa):
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Añade en Vercel `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y un `CRON_SECRET` aleatorio (`openssl rand -base64 32`).
3. Redeploy. Vercel Cron llama automáticamente a `/api/cron/recordatorios` cada día a las 19:00 UTC (configurable en `vercel.json`), y usa `CRON_SECRET` para autenticarse solo — no hace falta ningún paso manual adicional.
4. Cada usuaria activa sus recordatorios desde el botón "Activar recordatorio diario" en su panel; el navegador le pedirá permiso de notificaciones una vez.

Si `NEXT_PUBLIC_VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` no están configuradas, el botón simplemente no aparece y el cron no hace nada (no rompe el resto de la app).

### Registrar comida por foto (IA)

En "Otro alimento" (al registrar una comida), aparece un botón "📷 Registrar por foto (con IA)": la usuaria hace o sube una foto del plato, pulsa "Analizar con IA" y la app rellena el nombre, las kcal y los macros estimados usando la API de Claude (visión). **Siempre hay que revisar y confirmar los valores antes de guardar** — es una ayuda para no tener que calcularlo a mano, no un dato médico ni exacto; el modelo puede equivocarse, sobre todo con platos mixtos o poco habituales.

1. Consigue una clave en [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).
2. Añade `ANTHROPIC_API_KEY` en las variables de entorno de Vercel y redeploy.
3. Sin más configuración: cada llamada solo se hace cuando la usuaria pulsa "Analizar con IA" (no hay coste si nadie usa el botón). Las fotos se comprimen en el propio navegador antes de enviarse y no se guardan en ningún sitio — solo se usan para esa llamada puntual a la IA.

Si `ANTHROPIC_API_KEY` no está configurada, el botón simplemente no aparece.

### Dispositivo compartido entre varias personas

Si dos personas usan el mismo móvil/tablet (o Simón revisa varias personas seguidas), el botón "Salir" fuerza una recarga completa de la página en vez de una navegación interna, precisamente para no dejar ningún resto de la sesión anterior en memoria del navegador antes de que otra persona inicie sesión.

### Cambiar las contraseñas iniciales

Las contraseñas del seed son solo para el primer arranque. Para cambiarlas después, la forma más simple es actualizar `passwordHash` directamente en la base de datos con un hash de bcrypt (por ejemplo generado con `node -e "console.log(require('bcryptjs').hashSync('nueva-password', 10))"`), ya que la app no incluye (a propósito, para mantenerla simple) una pantalla de cambio de contraseña.

## Estructura del proyecto

```
prisma/
  schema.prisma        # modelo de datos
  migrations/           # migraciones versionadas
  seed.ts               # script de seed (CLI, usa src/lib/seed-core.ts)
src/
  app/
    login/               # pantalla de login
    (maite)/
      dashboard/          # día de hoy: registro de comidas y ejercicio, balance, semáforo
      historial/           # resumen semanal + histórico navegable (solo lectura)
      peso/                 # registro de peso + evolución
    admin/
      page.tsx                    # lista de personas + crear nueva
      usuarias/nueva/               # formulario de alta (cuenta + perfil)
      usuarias/[id]/                # resumen de esa persona (solo lectura)
      usuarias/[id]/historial/        # histórico de esa persona (solo lectura)
      usuarias/[id]/plan/             # editar su menú semanal, perfil y peso actual
      platos/                        # biblioteca de platos reutilizable entre personas
    api/admin/seed/       # endpoint de sembrado único, protegido por SEED_TOKEN
  components/
    FoodPicker.tsx          # buscador de alimentos con desplegable, reutilizado en varios formularios
  lib/
    auth/                 # hashing, sesión (JWT en cookie), guards por rol
    data/                  # consultas de lectura (día, semana, estadísticas, usuarias)
    actions/                # Server Actions de escritura (logs de usuaria, admin, búsqueda de alimentos)
    seed-core.ts             # lógica de sembrado, compartida por el script y el endpoint
    seed-data/                # dieta_maite_seed.json, foods.json (~630 alimentos)
    nutrition.ts              # fórmulas: kcal ejercicio, balance diario, semáforo, semana, objetivo de kcal
  proxy.ts                 # protección de rutas por rol (antes "middleware")
```

## Qué NO incluye (a propósito, según el encargo)

- Escáner de código de barras (sí hay tabla de composición de alimentos con buscador, ver arriba).
- Notificaciones push.
- Soporte multi-idioma (todo en español).
- Pantalla de cambio/recuperación de contraseña (ver arriba cómo cambiarla manualmente).
