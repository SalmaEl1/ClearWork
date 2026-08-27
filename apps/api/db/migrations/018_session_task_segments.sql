CREATE TABLE session_task_segments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_session_id UUID NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
    task_id         UUID REFERENCES tasks(id) ON DELETE SET NULL,
    description     TEXT,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at        TIMESTAMPTZ,

    CONSTRAINT segment_ends_after_start
        CHECK (ended_at IS NULL OR ended_at > started_at)
);

-- Como mucho un segmento abierto por jornada: mismo criterio que
-- idx_one_open_break_per_session en la migración 002.
CREATE UNIQUE INDEX idx_one_open_segment_per_session
    ON session_task_segments(work_session_id)
    WHERE ended_at IS NULL;

CREATE INDEX idx_segments_session ON session_task_segments(work_session_id);
CREATE INDEX idx_segments_task ON session_task_segments(task_id) WHERE task_id IS NOT NULL;
