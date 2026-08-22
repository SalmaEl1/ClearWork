-- Completa el registro de actividad de tareas: hasta ahora solo se
-- registraban los cambios de estado, no crearlas ni borrarlas.
ALTER TABLE activity_log DROP CONSTRAINT activity_log_type_check;
ALTER TABLE activity_log ADD CONSTRAINT activity_log_type_check
    CHECK (type IN (
        'user_created', 'user_updated', 'user_role_changed', 'user_deleted',
        'project_created', 'project_updated', 'project_archived', 'project_supervisor_changed', 'project_deleted',
        'task_created', 'task_status_changed', 'task_deleted',
        'member_joined', 'member_left'
    ));
