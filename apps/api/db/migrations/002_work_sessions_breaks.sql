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

-- Como máximo una jornada abierta por usuario. Esta es la garantía real
-- contra condiciones de carrera (dos peticiones de "fichar entrada" a la vez);
-- la comprobación en el servicio es una ayuda para dar un mensaje de error
-- claro, no la protección de fondo.
CREATE UNIQUE INDEX idx_one_open_session_per_user
    ON work_sessions(user_id)
    WHERE ended_at IS NULL;

CREATE INDEX idx_sessions_user_started ON work_sessions(user_id, started_at DESC);

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
