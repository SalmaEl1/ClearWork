-- Amplía el registro de actividad: editar/cambiar el rol/borrar una
-- cuenta desde el panel de admin no dejaba ningún rastro hasta ahora
-- (solo se registraba el alta).
ALTER TABLE activity_log DROP CONSTRAINT activity_log_type_check;
ALTER TABLE activity_log ADD CONSTRAINT activity_log_type_check
    CHECK (type IN (
        'user_created', 'user_updated', 'user_role_changed', 'user_deleted',
        'task_status_changed', 'member_joined', 'member_left'
    ));
