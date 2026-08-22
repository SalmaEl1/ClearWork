-- Notificaciones dentro de la propia plataforma (no solo por correo) para
-- trabajador y supervisor. Mismo patrón que activity_log (migración 007):
-- payload en JSONB, con los datos legibles ya guardados en el momento del
-- evento, para que la notificación sobreviva a que se borre lo que la
-- originó. A diferencia de activity_log, cada fila pertenece a un usuario
-- concreto (el destinatario) y se puede marcar como leída.
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL
                   CHECK (type IN (
                       'task_assigned', 'task_unassigned', 'task_status_changed',
                       'project_member_added', 'project_member_removed', 'project_supervisor_removed'
                   )),
    payload    JSONB NOT NULL,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
-- Para el contador de "no leídas" de la cabecera, sin escanear todo el
-- historial de cada usuario.
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
