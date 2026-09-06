-- Reserva de sitio en la oficina: una lista simple de asientos
-- numerados del 1 al total configurado por el admin (sin mapa visual,
-- de momento fuera del alcance de este TFG), uno por persona y día.
ALTER TABLE app_settings ADD COLUMN office_seat_count INTEGER NOT NULL DEFAULT 20;

CREATE TABLE seat_reservations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    seat_number INTEGER NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Un asiento no se puede reservar dos veces el mismo día...
    CONSTRAINT seat_reservations_unique_seat_per_day UNIQUE (date, seat_number),
    -- ...y nadie puede tener dos asientos reservados el mismo día.
    CONSTRAINT seat_reservations_unique_user_per_day UNIQUE (date, user_id)
);
