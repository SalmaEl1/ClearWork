-- Revierte la asociación de tareas al fichaje (issue #113): el fichaje
-- vuelve a limitarse a horas trabajadas, sin tramos por tarea.
DROP TABLE session_task_segments;
