-- Registro persistente de la actividad reciente del admin. Antes se
-- recalculaba en caliente cada vez a partir de users/task_status_history/
-- project_members, lo que significaba que un evento desaparecía del feed
-- en cuanto se borraba (por ejemplo, en cascada) la fila de la que salía.
-- Aquí cada evento se guarda ya con los datos legibles que necesita
-- (nombre, título…) en el momento en que ocurre, así que sobrevive a que
-- lo que lo originó deje de existir.
CREATE TABLE activity_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        TEXT NOT NULL
                    CHECK (type IN ('user_created', 'task_status_changed', 'member_joined', 'member_left')),
    payload     JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_occurred_at ON activity_log(occurred_at DESC);
CREATE INDEX idx_activity_log_type ON activity_log(type, occurred_at DESC);
