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
- `Profile` — datos antropométricos y objetivos calóricos, uno por usuaria (BMR, GET, objetivo kcal/día...).
- `DayPlan` — un plan por usuaria y día de la semana, con su tipo de día y objetivos de kcal/macros. **Cada usuaria tiene su propio menú semanal, independiente del de las demás.**
- `PlannedMeal` — cada plato planificado del menú semanal (día + comida) de una usuaria.
- `MealLog` — comidas realmente registradas por cada usuaria (del plan o libres), editables/borrables el mismo día.
- `ExerciseType` — tabla MET compartida (Descanso, Paseo suave, Caminar rápido...).
- `ExerciseLog` — sesiones de ejercicio registradas, por usuaria.
- `WeightLog` — histórico de peso, por usuaria.

### Varias personas

Solo el admin puede dar de alta cuentas nuevas, desde **Personas → + Nueva** en su panel: nombre, email, contraseña, y los datos de perfil (edad, altura, peso, BMR, GET, objetivos...). La cuenta nueva arranca con un menú semanal en blanco (7 días × 5 comidas, "Sin planificar") que el admin rellena después desde la ficha de esa persona → pestaña **Plan**, con el mismo editor que ya existía. No hay auto-registro: solo el admin crea cuentas.

El panel de admin ahora es un selector: **Personas** (lista + crear) → ficha de cada persona con **Resumen** / **Historial** / **Plan**, igual que antes pero repetido por persona en vez de asumir una única usuaria fija.

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
  lib/
    auth/                 # hashing, sesión (JWT en cookie), guards por rol
    data/                  # consultas de lectura (día, semana, estadísticas, usuarias)
    actions/                # Server Actions de escritura (logs de usuaria + admin)
    seed-core.ts             # lógica de sembrado, compartida por el script y el endpoint
    seed-data/                # dieta_maite_seed.json
    nutrition.ts              # fórmulas: kcal ejercicio, balance diario, semáforo, semana
  proxy.ts                 # protección de rutas por rol (antes "middleware")
```

## Qué NO incluye (a propósito, según el encargo)

- Base de datos de alimentos externa ni escáner de código de barras.
- Notificaciones push.
- Soporte multi-idioma (todo en español).
- Pantalla de cambio/recuperación de contraseña (ver arriba cómo cambiarla manualmente).
