CREATE TABLE leaves (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL
                   CHECK (type IN ('maternity_paternity', 'sick_leave', 'temporary_leave')),
    start_date DATE NOT NULL,
    end_date   DATE
                   CHECK (end_date IS NULL OR end_date >= start_date),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leaves_user_start ON leaves(user_id, start_date DESC);
