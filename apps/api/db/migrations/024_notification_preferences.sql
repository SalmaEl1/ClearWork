-- Issue #112: por dónde quiere cada persona recibir cada tipo de
-- notificación. Sin fila para un (user_id, notification_type) se aplica
-- el valor por defecto de DEFAULT_NOTIFICATION_CHANNEL (packages/shared),
-- que reproduce el comportamiento fijo que había antes de esta tabla —
-- así que no hace falta sembrar una fila por persona y tipo al migrar.
CREATE TABLE notification_preferences (
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type  TEXT NOT NULL
                            CHECK (notification_type IN (
                                'task_assigned', 'task_unassigned', 'task_status_changed',
                                'project_member_added', 'project_member_removed',
                                'project_supervisor_removed', 'project_assigned',
                                'vacation_decided', 'vacation_requested', 'absence_scheduled'
                            )),
    channel            TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'both', 'none')),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, notification_type)
);
