-- Issue #108: el historial de una tarea también debe registrar los
-- cambios de porcentaje de avance, no solo los de estado. Se reutiliza
-- task_status_history en vez de crear una tabla aparte -- ya es "el
-- historial de la tarea" a efectos de la app -- así que to_status pasa a
-- ser opcional y se añaden columnas de avance; el CHECK exige que cada
-- fila sea de un tipo o del otro, nunca las dos cosas ni ninguna.
ALTER TABLE task_status_history ALTER COLUMN to_status DROP NOT NULL;
ALTER TABLE task_status_history ADD COLUMN from_progress_percentage INTEGER;
ALTER TABLE task_status_history ADD COLUMN to_progress_percentage INTEGER;
ALTER TABLE task_status_history ADD CONSTRAINT task_status_history_kind_check
    CHECK (
        (to_status IS NOT NULL AND to_progress_percentage IS NULL) OR
        (to_status IS NULL AND to_progress_percentage IS NOT NULL)
    );
