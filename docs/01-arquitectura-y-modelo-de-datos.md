# ClearWork — Arquitectura y modelo de datos

Documento de diseño previo a la implementación. Recoge la estructura del proyecto,
el modelo de datos y las decisiones relevantes con su justificación.

---

## 1. Decisiones tecnológicas

| Decisión | Elección | Justificación |
|---|---|---|
| Organización | Monorepo con npm workspaces | Un único repositorio para entregar y desplegar; los tipos compartidos entre API y web se resuelven sin publicar paquetes. |
| Lenguaje | TypeScript en API y web | Los tipos documentan el modelo (roles, estados de tarea, payload del JWT) y detectan errores antes de ejecutar. |
| Acceso a datos | Driver `pg` + SQL escrito a mano | Sin capa que oculte el SQL: cada consulta e índice es visible y justificable. Migraciones en archivos `.sql` versionados. |
| Alcance del supervisor | ~~`users.supervisor_id`~~ → derivado de `project_members` | **Superado, ver §7.** El supervisor de un trabajador ya no es un campo propio: se deriva de en qué proyecto tiene membresía activa. |
| Vínculo tarea↔jornada | Tabla `task_status_history` con `work_session_id` | La tarea vive por encima de las jornadas; cada cambio de estado queda atribuido a la jornada abierta en ese momento. |
| Nomenclatura | Identificadores en inglés, documentación y UI en español | Coherente con el README y con la convención habitual en el código. |

Requisito de versión: **PostgreSQL 13 o superior**, porque se usa `gen_random_uuid()`
como generador de claves primarias, disponible de serie desde esa versión.

---

## 2. Estructura de carpetas

```
ClearWork/
├── package.json                  # workspaces: apps/*, packages/*
├── README.md
├── docs/
│   └── 01-arquitectura-y-modelo-de-datos.md
│
├── packages/
│   └── shared/                   # tipos compartidos API ↔ web
│       └── src/
│           ├── roles.ts          # Role, TaskStatus, BreakType
│           └── dto.ts            # formas de request/response
│
├── apps/
│   ├── api/
│   │   ├── .env.example
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── db/
│   │   │   └── migrations/
│   │   │       ├── 001_users.sql
│   │   │       ├── 002_work_sessions_breaks.sql
│   │   │       ├── 003_projects_tasks.sql
│   │   │       ├── 004_task_status_history.sql
│   │   │       └── 005_admin_role_and_project_members.sql   # ver §7
│   │   ├── src/
│   │   │   ├── index.ts               # arranque del servidor
│   │   │   ├── app.ts                 # montaje de Express y rutas
│   │   │   ├── config/
│   │   │   │   └── env.ts             # lectura y validación de variables de entorno
│   │   │   ├── db/
│   │   │   │   ├── pool.ts            # pool de conexiones
│   │   │   │   └── migrate.ts         # ejecutor de migraciones
│   │   │   ├── middleware/
│   │   │   │   ├── authenticate.ts    # verifica el JWT → req.user
│   │   │   │   ├── authorize.ts       # comprueba el rol
│   │   │   │   ├── validate.ts        # valida body/params con Zod
│   │   │   │   └── errorHandler.ts    # traduce errores a respuestas HTTP
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── work-sessions/     # fichajes y pausas
│   │   │   │   ├── projects/
│   │   │   │   ├── tasks/
│   │   │   │   ├── dashboard/
│   │   │   │   └── activity/          # OPCIONAL — integración ActivityWatch
│   │   │   └── shared/
│   │   │       ├── errors.ts          # AppError, NotFoundError, ForbiddenError…
│   │   │       └── time.ts            # cálculo de horas trabajadas
│   │   └── tests/
│   │
│   └── web/
│       ├── package.json
│       ├── vite.config.ts
│       └── src/
│           ├── main.tsx
│           ├── router.tsx             # rutas públicas / protegidas / por rol
│           ├── api/
│           │   └── client.ts          # fetch con inyección del token
│           ├── auth/
│           │   ├── AuthContext.tsx
│           │   └── RequireRole.tsx
│           ├── layouts/
│           ├── components/
│           ├── pages/
│           │   ├── Login.tsx
│           │   ├── worker/
│           │   └── supervisor/
│           └── styles/
```

Cada módulo del backend sigue siempre las mismas cuatro capas:

```
routes.ts       → define rutas y middlewares (autenticación, rol, validación)
controller.ts   → traduce HTTP ↔ dominio; sin reglas de negocio
service.ts      → reglas de negocio (aquí y solo aquí)
repository.ts   → consultas SQL; sin reglas de negocio
schemas.ts      → esquemas Zod de validación de entrada
```

El motivo de esta separación es poder responder sin ambigüedad a la pregunta
"¿dónde está la lógica de negocio?": siempre en `service.ts`.

---

## 3. Modelo de datos

### 3.1 Diagrama de relaciones

```
                    ┌──────────────────┐
                    │      users       │
                    │  role: worker |  │
                    │       supervisor │
                    └───┬────────┬─────┘
       supervisor_id ───┘        │
        (auto-referencia)        │ user_id
                                 ▼
                        ┌──────────────────┐
                        │  work_sessions   │  entrada / salida
                        └────────┬─────────┘
                                 │ work_session_id
                                 ▼
                        ┌──────────────────┐
                        │      breaks      │  lunch | ergonomic
                        └──────────────────┘

  ┌──────────────┐        ┌──────────────┐       ┌───────────────────────┐
  │   projects   │───────▶│    tasks     │──────▶│  task_status_history  │
  └──────────────┘        └──────────────┘       └───────────┬───────────┘
                            assignee_id                      │ work_session_id
                                 │                           │  (nullable)
                                 ▼                           ▼
                              users                    work_sessions

  ── módulo opcional, desacoplado ──────────────────────────────────
  ┌──────────────────────────────┐      ┌────────────────────────┐
  │ activity_integration_settings│      │ activity_daily_summary │
  └──────────────────────────────┘      └────────────────────────┘
```

### 3.2 `users`

> **Nota (§7):** esta es la forma *original* de la tabla, previa a añadir
> proyectos con membresía y el rol `admin`. La migración 005 elimina la
> columna `supervisor_id` y su restricción. Se deja el SQL original aquí
> como referencia histórica del diseño; el estado actual está en §7.

```sql
CREATE TABLE users (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                TEXT NOT NULL UNIQUE,
    password_hash        TEXT NOT NULL,
    full_name            TEXT NOT NULL,
    role                 TEXT NOT NULL
                             CHECK (role IN ('worker', 'supervisor')),
    supervisor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    weekly_target_hours  NUMERIC(4,1) NOT NULL DEFAULT 40,
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- un supervisor no cuelga de otro supervisor
    CONSTRAINT supervisor_has_no_supervisor
        CHECK (role <> 'supervisor' OR supervisor_id IS NULL)
);

CREATE INDEX idx_users_supervisor ON users(supervisor_id);
```

Notas de diseño:

- **`role` como `TEXT` con `CHECK`, no como `ENUM` de PostgreSQL.** Añadir un valor a
  un tipo `ENUM` requiere `ALTER TYPE` y no se puede eliminar; con `CHECK` basta
  reescribir la restricción en una migración. Con dos roles fijos la diferencia es
  menor, pero la restricción `CHECK` es más fácil de evolucionar.
- **El email se normaliza a minúsculas en la capa de servicio** antes de insertar o
  consultar, para que la restricción `UNIQUE` funcione como se espera.
- **Limitación conocida:** una clave ajena no puede exigir que el usuario apuntado por
  `supervisor_id` tenga rol `supervisor`. Se valida en la capa de servicio. La
  alternativa en base de datos sería un *trigger* o una clave ajena compuesta con
  columna generada; se descarta por complejidad frente al beneficio.
- `weekly_target_hours` vive en el usuario y no como constante global, porque el
  dashboard compara horas reales contra objetivo y puede haber jornadas reducidas.

### 3.3 `work_sessions` — la jornada

```sql
CREATE TABLE work_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at    TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT session_ends_after_start
        CHECK (ended_at IS NULL OR ended_at > started_at)
);

-- Como máximo una jornada abierta por usuario.
CREATE UNIQUE INDEX idx_one_open_session_per_user
    ON work_sessions(user_id)
    WHERE ended_at IS NULL;

CREATE INDEX idx_sessions_user_started ON work_sessions(user_id, started_at DESC);
```

El **índice único parcial** es la pieza clave del módulo de fichajes: hace
imposible que un usuario tenga dos jornadas abiertas a la vez, incluso ante dos
peticiones simultáneas. La comprobación equivalente en el servicio
(`SELECT` y después `INSERT`) tiene una condición de carrera; el índice no.
El servicio comprueba igualmente el estado para devolver un `409 Conflict` con un
mensaje claro, pero la garantía real la da la base de datos.

### 3.4 `breaks` — las pausas

```sql
CREATE TABLE breaks (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_session_id  UUID NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
    type             TEXT NOT NULL CHECK (type IN ('lunch', 'ergonomic')),
    started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at         TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT break_ends_after_start
        CHECK (ended_at IS NULL OR ended_at > started_at)
);

-- Como máximo una pausa abierta por jornada.
CREATE UNIQUE INDEX idx_one_open_break_per_session
    ON breaks(work_session_id)
    WHERE ended_at IS NULL;

CREATE INDEX idx_breaks_session ON breaks(work_session_id);
```

Las pausas son **filas hijas de la jornada**, no eventos sueltos. Consecuencias:

- No puede existir una pausa sin jornada abierta: lo impide la clave ajena.
- Cerrar la jornada arrastra sus pausas (`ON DELETE CASCADE` para el borrado, y el
  servicio cierra automáticamente la pausa abierta al fichar la salida).
- El cálculo de horas es una resta, sin necesidad de reconstruir una máquina de
  estados a partir de una secuencia de eventos.

**Alternativa descartada:** una única tabla de eventos tipados
(`clock_in`, `clock_out`, `break_start`, `break_end`). Es más flexible y es lo que
usaría un sistema de auditoría, pero obliga a validar el orden de los eventos en
código y a derivar el estado actual recorriendo la secuencia. Para el alcance de
este proyecto, el modelo jornada + pausas es más simple de implementar y de
justificar.

**Cálculo de horas trabajadas:**

```
horas_trabajadas(jornada) = (ended_at − started_at) − Σ duración de pausas no computables
```

Qué pausas descuentan se define en una única constante en `shared/time.ts`, de modo
que cambiar el criterio sea modificar una línea:

```ts
// Las pausas ergonómicas (descanso visual) se consideran tiempo de trabajo
// efectivo; la pausa de comida, no.
const BREAK_COUNTS_AS_WORKED: Record<BreakType, boolean> = {
    ergonomic: true,
    lunch: false,
};
```

### 3.5 `projects` y `tasks`

```sql
CREATE TABLE projects (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    description   TEXT,
    supervisor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_archived   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assignee_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title        TEXT NOT NULL,
    description  TEXT,
    status       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'in_progress', 'done')),
    due_date     DATE,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_assignee_status ON tasks(assignee_id, status);
CREATE INDEX idx_tasks_project_status  ON tasks(project_id, status);
```

`assignee_id` es anulable: una tarea puede existir en el proyecto sin estar todavía
asignada. Los dos índices compuestos cubren exactamente las dos consultas del
sistema: "mis tareas por estado" (trabajador) y "tareas del proyecto por estado"
(dashboard de supervisor).

### 3.6 `task_status_history` — el vínculo con la jornada

```sql
CREATE TABLE task_status_history (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id          UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    from_status      TEXT,
    to_status        TEXT NOT NULL,
    changed_by       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    work_session_id  UUID REFERENCES work_sessions(id) ON DELETE SET NULL,
    changed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_history_task    ON task_status_history(task_id, changed_at DESC);
CREATE INDEX idx_history_session ON task_status_history(work_session_id);
```

Cuando un trabajador cambia el estado de una tarea, el servicio busca su jornada
abierta y la registra en `work_session_id`. Es **anulable a propósito**: si el cambio
lo hace un supervisor, o un trabajador sin haber fichado, la fila se guarda igual
con `work_session_id = NULL`. El historial nunca bloquea la operación.

Esto permite responder a "¿en qué trabajó esta persona durante la jornada de ayer?"
sin obligar a nadie a imputar tiempo manualmente, y sin romper las tareas que se
prolongan varios días.

---

## 4. Autorización por rol

El JWT transporta un payload mínimo:

```ts
type JwtPayload = {
    sub: string;   // users.id
    role: Role;    // 'worker' | 'supervisor'
};
```

Nada más: ni nombre ni email. El token es legible por cualquiera que lo tenga, así
que solo lleva lo imprescindible para autorizar. Los datos del usuario se piden a
`GET /api/auth/me`.

La autorización se aplica en **tres niveles**, y ninguno sustituye a los anteriores:

1. **Autenticación** (`authenticate`): el token es válido y no ha caducado → `req.user`.
2. **Rol** (`authorize('worker')`): filtro grueso a nivel de ruta. Aquí se implementa
   la regla "un supervisor no ficha": las rutas de `/api/work-sessions` de creación
   exigen rol `worker`, de modo que el supervisor recibe `403` aunque manipule la UI.
3. **Propiedad del recurso**, dentro del servicio: el filtro por rol no basta, porque
   dos trabajadores tienen el mismo rol y no deben ver los fichajes del otro. Toda
   consulta de un trabajador lleva `WHERE user_id = $userId` en el propio SQL, no
   un filtro posterior en memoria.

Para el supervisor, la regla es simétrica: solo accede a datos de trabajadores
cuyo proyecto activo lo tiene a él como supervisor. Se resuelve con un `JOIN` sobre
`project_members` y `projects` dentro de la misma consulta — ver §7, que sustituye la
versión original de esta regla (comparar `supervisor_id` directamente).

El payload del JWT y el elenco de roles también cambian en §7: hay un tercer rol,
`admin`, que no ficha ni tiene dashboard propio — solo gestiona cuentas, proyectos y
asignaciones desde su propio panel.

---

## 5. Módulo opcional: integración con ActivityWatch

**No se implementa en esta fase.** Se documenta aquí para dejar clara su ubicación en
la arquitectura y garantizar que el núcleo no depende de él.

Requisitos innegociables del módulo:

1. Solo métricas **agregadas**: tiempo activo total y distribución por categoría de
   aplicación. Nunca pulsaciones, capturas de pantalla ni URLs concretas.
2. **Consentimiento explícito** del trabajador antes de activarse.
3. **Completamente opcional**: fichajes y tareas funcionan al 100% sin él.

Diseño para cumplirlos:

- El consentimiento **no** es una columna de `users`, sino una tabla propia. Así el
  módulo entero (tablas incluidas) puede eliminarse sin tocar el esquema del núcleo,
  y la ausencia de fila equivale a "sin consentimiento" — el valor seguro por defecto.

```sql
-- migración separada, no forma parte del núcleo
CREATE TABLE activity_integration_settings (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    consent_given       BOOLEAN NOT NULL DEFAULT FALSE,
    consent_updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    aw_base_url         TEXT NOT NULL DEFAULT 'http://localhost:5600'
);

CREATE TABLE activity_daily_summary (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day            DATE NOT NULL,
    category       TEXT NOT NULL,   -- p. ej. 'development', 'communication', 'other'
    active_minutes INTEGER NOT NULL CHECK (active_minutes >= 0),
    collected_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (user_id, day, category)
);
```

La restricción `UNIQUE (user_id, day, category)` permite que la recolección sea
**idempotente**: un `INSERT ... ON CONFLICT DO UPDATE` puede ejecutarse varias veces
al día sin duplicar datos. Y el hecho de que el grano mínimo sea *día + categoría*
hace **estructuralmente imposible** almacenar un evento individual: aunque alguien
quisiera guardar una URL concreta, no hay dónde ponerla.

- El servicio de recolección vive en `modules/activity/`, se activa mediante una
  variable de entorno (`ACTIVITY_INTEGRATION_ENABLED`) y el núcleo nunca lo importa.
  La dependencia va en un solo sentido: `activity` → `core`, nunca al revés.

**Pendiente antes de implementar:** consultar la API REST real de ActivityWatch
(`http://localhost:5600`) para determinar qué endpoints devuelven agregados sin
exponer eventos en bruto. No se documentan aquí endpoints concretos para no fijar
por escrito una API que todavía no se ha verificado.

---

## 6. Orden de implementación

1. Configuración del backend, conexión a PostgreSQL, migraciones. ← **siguiente paso**
2. Usuarios y autenticación JWT con los dos roles.
3. Módulo de fichajes (jornada y pausas).
4. Módulo de proyectos y tareas.
5. Frontend: login y layout base con las dos vistas.
6. Dashboards (trabajador y supervisor).
7. Opcional: integración con ActivityWatch.

---

## 7. Ampliación: proyectos con membresía y rol admin

Añadido después del núcleo inicial, a partir de un requisito nuevo: un proyecto
tiene un único supervisor y varios trabajadores; un trabajador está en un
proyecto como mucho a la vez, pero puede salir de uno y entrar en otro; y hace falta
un rol por encima del supervisor que dé de alta cuentas, cree proyectos y haga las
asignaciones. Migración `005_admin_role_and_project_members.sql`.

### 7.1 `project_members`

```sql
CREATE TABLE project_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at     TIMESTAMPTZ,

    CONSTRAINT membership_ends_after_start
        CHECK (left_at IS NULL OR left_at > joined_at)
);

CREATE UNIQUE INDEX idx_one_active_membership_per_worker
    ON project_members(user_id)
    WHERE left_at IS NULL;
```

Exactamente el mismo patrón que `work_sessions`: una fila por membresía, `left_at`
nulo mientras está activa, y un índice único parcial que garantiza **a nivel de base
de datos** "como mucho un proyecto activo por trabajador" — no solo comprobado en
el servicio. "Salir de un proyecto" es poner `left_at`; "entrar en otro" es una fila
nueva. De regalo queda el historial de por qué proyectos ha pasado cada uno, útil para
auditoría aunque hoy no se explote en ningún dashboard.

**`users.supervisor_id` se elimina.** El supervisor de un trabajador ya no es un
campo propio: es *el `supervisor_id` del proyecto en el que tiene membresía activa*.
Tenerlo como campo aparte habría sido una segunda fuente de verdad que podía
contradecir a la primera (¿y si su proyecto lo lleva otro supervisor?). Sin proyecto
activo, sin supervisor — estado válido, no un error. Esto también simplificó una
validación que ya existía: si antes "¿puede este supervisor asignarte una tarea?"
comprobaba `worker.supervisor_id === supervisorId`, ahora comprueba directamente que
el trabajador es miembro activo del proyecto de la tarea — más simple y más
correcto, porque es literalmente la pregunta que importa.

### 7.2 Rol `admin`

`users.role` pasa a admitir `'worker' | 'supervisor' | 'admin'`. El admin no ficha, no
tiene dashboard de equipo ni gestiona tareas del día a día — tiene su propio panel
(`/admin/users`, `/admin/projects`) separado de todo lo demás, reforzado en
`authorize('admin')` en el backend igual que cualquier otro rol. No hay autoregistro
público: la única cuenta que se crea sin pasar por el panel es el primer admin,
mediante un script de arranque idempotente (`db/seedAdmin.ts`, variables
`ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_FULL_NAME`) — a partir de ahí, el admin da de
alta a supervisores y trabajadores desde la UI.

### 7.3 Dos condiciones de carrera encontradas al probarlo (y su arreglo)

Ambas aparecieron con pruebas de concurrencia real (varias peticiones simultáneas),
no por inspección de código — vale la pena explicarlas en la defensa porque son sutiles.

**a) La reasignación de proyecto necesitaba más que el índice único.**
"Mover a alguien de proyecto" es un `UPDATE` (cerrar la membresía vieja) seguido de un
`INSERT` (abrir la nueva) en una transacción. Si el trabajador no tenía membresía
previa, el `UPDATE` no bloquea nada — y dos admins reasignándolo a la vez pueden
llegar los dos al `INSERT` sin que ninguno vea al otro, chocando contra el índice
único. Reintentar a ciegas no bastaba (con varias peticiones a la vez, más de dos
podían chocar entre sí). Se resolvió con un **advisory lock de PostgreSQL** con clave
`hashtext(userId)` como primer paso de la transacción: serializa entre sí las
reasignaciones *de esa misma persona*, sin bloquear las de cualquier otro
trabajador. Ver `reassignMembership` en `projects/repository.ts`.

**b) `now()` no es el instante real dentro de una transacción bloqueada.**
Con el advisory lock en marcha, seguía fallando: la restricción `left_at > joined_at`
saltaba de vez en cuando. Causa: `now()` en PostgreSQL se congela al `BEGIN` de la
transacción, no al momento en que se ejecuta cada sentencia. Una transacción que
esperó un rato en el advisory lock puede acabar escribiendo un `left_at` (con su
`now()` congelado, de *antes* de esperar) anterior al `joined_at` de la fila que
otra transacción — empezada después pero que coló primero — ya confirmó. Arreglado
usando `clock_timestamp()` en su lugar, que sí devuelve el instante real de
ejecución. Detalle fácil de pasar por alto y que vale la pena mencionar si preguntan
por diferencias entre `now()`, `clock_timestamp()` y `statement_timestamp()`.
