-- Nuevo tipo de notificación (issue #116): al supervisor, cuando se le
-- asigna un proyecto (al crearlo con él como supervisor, o al
-- reasignárselo desde otro supervisor).
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'task_assigned', 'task_unassigned', 'task_status_changed',
        'project_member_added', 'project_member_removed', 'project_supervisor_removed',
        'project_assigned',
        'vacation_decided', 'vacation_requested', 'absence_scheduled'
    ));
