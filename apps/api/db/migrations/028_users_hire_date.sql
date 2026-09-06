-- Fecha de contratación de cada persona, para calcular su saldo anual de
-- vacaciones (ver vacations/balance.ts): antes se usaba created_at como
-- aproximación, pero esa es la fecha en la que se creó la cuenta en el
-- sistema, no necesariamente cuándo empezó a trabajar de verdad. Ahora
-- es un campo propio que rellena el admin al crear o editar la cuenta.
--
-- Los usuarios ya existentes se completan con su created_at, la mejor
-- aproximación disponible; un ALTER...SET NOT NULL falla si queda
-- alguna fila en NULL, así que el backfill va antes.
ALTER TABLE users ADD COLUMN hire_date DATE;
UPDATE users SET hire_date = created_at::date WHERE hire_date IS NULL;
ALTER TABLE users ALTER COLUMN hire_date SET NOT NULL;
