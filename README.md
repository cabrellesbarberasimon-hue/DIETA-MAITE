# Dieta Maite

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
- `DayPlan` / `PlannedMeal` — el menú planificado por día de la semana (platos de cada comida), independiente del tipo de día.
- `MealLog` / `ExerciseLog` / `WeightLog` — comidas, ejercicio y peso realmente registrados, **editables/borrables cualquier día**, no solo hoy.
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
