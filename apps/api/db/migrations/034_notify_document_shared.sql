-- Nuevo tipo de notificación: cuando un admin o supervisor comparte un
-- documento con un trabajador (ver documents/service.ts).
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'task_assigned', 'task_unassigned', 'task_status_changed',
        'project_member_added', 'project_member_removed', 'project_supervisor_removed',
        'project_assigned',
        'vacation_decided', 'vacation_requested', 'absence_scheduled',
        'document_shared'
    ));

ALTER TABLE notification_preferences DROP CONSTRAINT notification_preferences_notification_type_check;
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_notification_type_check
    CHECK (notification_type IN (
        'task_assigned', 'task_unassigned', 'task_status_changed',
        'project_member_added', 'project_member_removed',
        'project_supervisor_removed', 'project_assigned',
        'vacation_decided', 'vacation_requested', 'absence_scheduled',
        'document_shared'
    ));
