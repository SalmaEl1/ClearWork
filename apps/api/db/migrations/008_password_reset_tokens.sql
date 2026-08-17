-- Recuperación de contraseña autoservicio. Se guarda el hash del token
-- (SHA-256, no bcrypt: es un valor aleatorio de alta entropía que se
-- busca por igualdad, no una contraseña de baja entropía que necesite un
-- hash lento para resistir fuerza bruta), nunca el token en claro.
CREATE TABLE password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);
