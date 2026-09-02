-- Datos del cliente de un proyecto: nombre y contacto. Los da de alta el
-- admin al crear el proyecto, o los añade después editándolo — nunca el
-- supervisor ni el trabajador, que solo los pueden ver. Nullable a
-- propósito: un proyecto puede no tener cliente asociado (interno, o
-- pendiente de rellenar).
ALTER TABLE projects ADD COLUMN client_name TEXT;
ALTER TABLE projects ADD COLUMN client_contact TEXT;
