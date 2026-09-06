-- Documentos que un admin o supervisor comparte con uno o varios
-- trabajadores (nómina, documentación de cliente, políticas de
-- empresa...). El archivo en sí se guarda en disco (ver
-- documents/storage.ts); aquí solo su metadato y con quién se compartió.
CREATE TABLE documents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label         TEXT NOT NULL,
    original_name TEXT NOT NULL,
    stored_name   TEXT NOT NULL UNIQUE,
    mime_type     TEXT NOT NULL,
    size_bytes    INTEGER NOT NULL,
    uploaded_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A quién se compartió: una fila por destinatario, tanto si se manda a
-- una sola persona como si se manda "de forma colectiva" a varias a la
-- vez (la UI ofrece elegir varias, pero para el modelo de datos es lo
-- mismo: N destinatarios).
CREATE TABLE document_recipients (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    PRIMARY KEY (document_id, user_id)
);

CREATE INDEX idx_document_recipients_user ON document_recipients(user_id);
