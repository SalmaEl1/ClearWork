-- Tipo de contrato de cada persona (jornada completa, media jornada o
-- prácticas), lo elige el admin al crear o editar la cuenta desde un
-- desplegable — visible después en el perfil del propio trabajador.
-- 'full_time' como valor por defecto para las cuentas ya existentes:
-- es la situación más habitual y evita tener que pedir este dato
-- retroactivamente a quien ya tenía cuenta.
ALTER TABLE users ADD COLUMN contract_type TEXT NOT NULL DEFAULT 'full_time'
    CHECK (contract_type IN ('full_time', 'part_time', 'internship'));
ALTER TABLE users ALTER COLUMN contract_type DROP DEFAULT;
