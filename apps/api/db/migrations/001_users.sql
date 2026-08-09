-- gen_random_uuid() es una función incorporada en PostgreSQL desde la versión 13,
-- no requiere ninguna extensión adicional.

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

    CONSTRAINT supervisor_has_no_supervisor
        CHECK (role <> 'supervisor' OR supervisor_id IS NULL)
);

CREATE INDEX idx_users_supervisor ON users(supervisor_id);
