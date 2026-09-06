import type { DocumentDTO } from "@clearwork/shared";
import { useEffect, useState } from "react";
import { ApiError } from "../../api/client.js";
import { downloadDocument, fetchMyDocuments } from "../../api/documents.js";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function WorkerDocuments() {
  const [documents, setDocuments] = useState<DocumentDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyDocuments()
      .then(setDocuments)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar los documentos"));
  }, []);

  async function handleDownload(id: string, originalName: string) {
    setError(null);
    try {
      await downloadDocument(id, originalName);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo descargar");
    }
  }

  return (
    <div className="dashboard-grid">
      <h2>Documentos</h2>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {!documents && <p>Cargando…</p>}
        {documents && documents.length === 0 && <p>Todavía no tienes ningún documento compartido.</p>}
        {documents && documents.length > 0 && (
          <ul className="team-list">
            {documents.map((d) => (
              <li key={d.id} className="team-list__item">
                <span className="team-list__name">{d.label}</span>
                <span className="team-list__hours">
                  {d.originalName} ({formatSize(d.sizeBytes)}) — compartido por {d.uploaderName}
                </span>
                <button type="button" className="secondary" onClick={() => handleDownload(d.id, d.originalName)}>
                  Descargar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
