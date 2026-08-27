CREATE TABLE trainings (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title      TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE training_assignments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_id  UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by  UUID NOT NULL REFERENCES users(id),
    assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_assignments_user ON training_assignments(user_id, assigned_at DESC);

-- Un nuevo tipo de notificación (training_assigned) se suma a los que ya
-- admitían las migraciones 013 y 015.
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'task_assigned', 'task_unassigned', 'task_status_changed',
        'project_member_added', 'project_member_removed', 'project_supervisor_removed',
        'vacation_decided', 'training_assigned'
    ));
