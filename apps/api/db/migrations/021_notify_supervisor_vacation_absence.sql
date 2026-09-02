-- Dos tipos de notificación nuevos (issue #99): al supervisor, cuando
-- alguien de su equipo solicita vacaciones o programa una ausencia.
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'task_assigned', 'task_unassigned', 'task_status_changed',
        'project_member_added', 'project_member_removed', 'project_supervisor_removed',
        'vacation_decided', 'vacation_requested', 'absence_scheduled'
    ));
