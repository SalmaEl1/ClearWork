-- Elimina la funcionalidad de formaciones (issue #111). Se borran antes
-- las notificaciones de tipo training_assigned que pudiera haber, para
-- no dejar filas que violen el CHECK una vez estrechado.
DELETE FROM notifications WHERE type = 'training_assigned';

ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'task_assigned', 'task_unassigned', 'task_status_changed',
        'project_member_added', 'project_member_removed', 'project_supervisor_removed',
        'vacation_decided'
    ));

DROP TABLE training_assignments;
DROP TABLE trainings;
