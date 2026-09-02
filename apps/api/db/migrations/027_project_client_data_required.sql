-- Los datos del cliente pasan de opcionales a obligatorios: todo
-- proyecto debe tener un cliente asociado desde que se crea. Los
-- proyectos ya existentes se rellenan con un valor provisional antes de
-- imponer la restricción, porque un ALTER...SET NOT NULL falla si ya
-- hay alguna fila en NULL.
UPDATE projects SET client_name = 'Sin especificar' WHERE client_name IS NULL;
UPDATE projects SET client_contact = 'Sin especificar' WHERE client_contact IS NULL;
ALTER TABLE projects ALTER COLUMN client_name SET NOT NULL;
ALTER TABLE projects ALTER COLUMN client_contact SET NOT NULL;
