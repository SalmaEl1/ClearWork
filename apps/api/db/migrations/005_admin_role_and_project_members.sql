-- Permite el nuevo rol 'admin'.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('worker', 'supervisor', 'admin'));

-- El supervisor de un trabajador se deriva de su membresía activa en
-- un proyecto (el supervisor de ese proyecto), no de un campo aparte que
-- podría contradecirlo. Se elimina la columna y sus restricciones.
ALTER TABLE users DROP CONSTRAINT supervisor_has_no_supervisor;
ALTER TABLE users DROP CONSTRAINT users_supervisor_id_fkey;
DROP INDEX idx_users_supervisor;
ALTER TABLE users DROP COLUMN supervisor_id;

CREATE TABLE project_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at     TIMESTAMPTZ,

    CONSTRAINT membership_ends_after_start
        CHECK (left_at IS NULL OR left_at > joined_at)
);

-- Como máximo una membresía activa por trabajador: el mismo patrón que
-- "una jornada abierta por usuario" en work_sessions, y la misma garantía
-- real (a nivel de base de datos, no solo comprobada en el servicio).
CREATE UNIQUE INDEX idx_one_active_membership_per_worker
    ON project_members(user_id)
    WHERE left_at IS NULL;

CREATE INDEX idx_membership_project ON project_members(project_id);
CREATE INDEX idx_membership_user_joined ON project_members(user_id, joined_at DESC);
