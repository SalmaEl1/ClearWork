import type { SentDocumentDTO } from "@clearwork/shared";
import { useState } from "react";
import { ApiError } from "../api/client.js";
import { deleteDocument, downloadDocument } from "../api/documents.js";
import { ConfirmDialog } from "./ConfirmDialog.js";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SentDocumentsList({
  documents,
  onChanged,
}: {
  documents: SentDocumentDTO[] | null;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteDocument(id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(id: string, originalName: string) {
    setError(null);
    try {
      await downloadDocument(id, originalName);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo descargar");
    }
  }

  return (
    <div className="card">
      <h3>Documentos compartidos</h3>
      {error && <div className="error-banner">{error}</div>}
      {!documents && <p>Cargando…</p>}
      {documents && documents.length === 0 && <p>Todavía no has compartido ningún documento.</p>}
      {documents && documents.length > 0 && (
        <ul className="team-list">
          {documents.map((d) => (
            <li key={d.id} className="team-list__item">
              <span className="team-list__name">{d.label}</span>
              <span className="team-list__hours">
                {d.originalName} ({formatSize(d.sizeBytes)}) — {d.recipients.map((r) => r.fullName).join(", ")}
              </span>
              <div className="row-actions">
                <button type="button" className="secondary" onClick={() => handleDownload(d.id, d.originalName)}>
                  Descargar
                </button>
                <button type="button" className="secondary" onClick={() => setDeletingId(d.id)}>
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {deletingId && (
        <ConfirmDialog
          title="Eliminar documento"
          message="¿Eliminar este documento? Dejará de estar disponible para quien lo tuviera compartido."
          confirmLabel="Eliminar"
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
