-- Festivos personalizados que añade el admin (p. ej. un puente local o
-- un día de empresa), aparte de los festivos nacionales fijos de España
-- que se calculan en código (ver holidays/nationalHolidays.ts) y por eso
-- no tienen fila aquí: no cambian de un año a otro y no los puede
-- borrar nadie, así que no hace falta guardarlos.
CREATE TABLE holidays (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date       DATE NOT NULL UNIQUE,
    label      TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
