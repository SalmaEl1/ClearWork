CREATE TABLE task_status_history (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id          UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    from_status      TEXT,
    to_status        TEXT NOT NULL,
    changed_by       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    -- Nullable a propósito: si quien cambia el estado no tiene una jornada
    -- abierta (o es un supervisor), el historial se guarda igualmente.
    work_session_id  UUID REFERENCES work_sessions(id) ON DELETE SET NULL,
    changed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_history_task    ON task_status_history(task_id, changed_at DESC);
CREATE INDEX idx_history_session ON task_status_history(work_session_id);
