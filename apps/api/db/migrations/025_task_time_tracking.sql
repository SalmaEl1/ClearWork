-- Issue #114: estimación de horas por tarea, y registro de lo que
-- realmente se le ha dedicado. Nullable a propósito: no toda tarea lleva
-- una estimación. Misma precisión que weekly_target_hours (001_users.sql).
ALTER TABLE tasks ADD COLUMN estimated_hours NUMERIC(5,1);

-- Un registro por cada vez que alguien anota tiempo dedicado: se guarda
-- en minutos (quien registra puede teclearlo en horas, minutos o días,
-- pero el servidor lo convierte antes de guardar — ver tasks/service.ts),
-- con una descripción breve de qué se hizo, obligatoria porque es la
-- parte que de verdad aporta contexto a quien lo lea después.
CREATE TABLE task_time_entries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    logged_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    minutes     INTEGER NOT NULL CHECK (minutes > 0),
    description TEXT NOT NULL,
    logged_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_time_entries_task ON task_time_entries(task_id, logged_at DESC);
