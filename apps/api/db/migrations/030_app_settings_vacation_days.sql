-- Si un fin de semana cae dentro de un rango de vacaciones pedido,
-- ¿cuenta como día de vacación consumido? TRUE (por defecto) = no
-- cuenta, se descuenta del saldo solo por los días laborables del
-- rango — es lo más habitual. El admin lo puede desactivar desde
-- Ajustes si su empresa cuenta el rango completo tal cual.
ALTER TABLE app_settings
    ADD COLUMN exclude_weekends_from_vacation_days BOOLEAN NOT NULL DEFAULT TRUE;
