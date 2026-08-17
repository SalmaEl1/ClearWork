-- Ajustes globales de la aplicación, editables desde el panel de admin.
-- Fila única (singleton): no hay ningún caso de uso para más de una
-- configuración activa a la vez, así que se fuerza con un CHECK en vez
-- de añadir lógica para "encontrar la fila de ajustes".
CREATE TABLE app_settings (
    id                          BOOLEAN PRIMARY KEY DEFAULT TRUE,
    default_weekly_target_hours NUMERIC(4,1) NOT NULL DEFAULT 40,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT app_settings_is_singleton CHECK (id)
);

INSERT INTO app_settings (id) VALUES (TRUE);
