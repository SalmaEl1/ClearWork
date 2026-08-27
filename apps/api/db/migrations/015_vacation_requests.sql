CREATE TABLE vacation_requests (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date   DATE NOT NULL
                   CHECK (end_date >= start_date),
    status     TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vacation_requests_user_start ON vacation_requests(user_id, start_date DESC);

-- Un nuevo tipo de notificación (vacation_decided) se suma a los que ya
-- admitía la migración 013: hay que ampliar el CHECK, no basta con el de
-- entonces.
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'task_assigned', 'task_unassigned', 'task_status_changed',
        'project_member_added', 'project_member_removed', 'project_supervisor_removed',
        'vacation_decided'
    ));
