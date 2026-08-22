-- Amplía el registro de actividad con las acciones del admin sobre
-- proyectos: crear, editar, archivar/desarchivar, reasignar supervisor y
-- borrar. Hasta ahora solo se registraban las altas/bajas de miembros.
ALTER TABLE activity_log DROP CONSTRAINT activity_log_type_check;
ALTER TABLE activity_log ADD CONSTRAINT activity_log_type_check
    CHECK (type IN (
        'user_created', 'user_updated', 'user_role_changed', 'user_deleted',
        'project_created', 'project_updated', 'project_archived', 'project_supervisor_changed', 'project_deleted',
        'task_status_changed', 'member_joined', 'member_left'
    ));
