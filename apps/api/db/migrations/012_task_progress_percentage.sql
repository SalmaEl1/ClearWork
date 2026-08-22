-- Porcentaje de avance de una tarea (0-100), independiente de su estado:
-- lo puede tocar tanto el trabajador asignado como el supervisor.
ALTER TABLE tasks ADD COLUMN progress_percentage SMALLINT NOT NULL DEFAULT 0
    CHECK (progress_percentage BETWEEN 0 AND 100);
