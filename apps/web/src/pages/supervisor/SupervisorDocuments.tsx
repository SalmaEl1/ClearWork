import type { SentDocumentDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../api/client.js";
import { fetchSupervisorDashboard } from "../../api/dashboard.js";
import { fetchSentDocuments } from "../../api/documents.js";
import { DocumentUploadForm } from "../../components/DocumentUploadForm.js";
import { SentDocumentsList } from "../../components/SentDocumentsList.js";

export function SupervisorDocuments() {
  const [workers, setWorkers] = useState<{ id: string; fullName: string }[]>([]);
  const [documents, setDocuments] = useState<SentDocumentDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchSentDocuments()
      .then(setDocuments)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar los documentos"));
  }, []);

  useEffect(() => {
    load();
    fetchSupervisorDashboard()
      .then((dashboard) => setWorkers(dashboard.team.map((m) => ({ id: m.id, fullName: m.fullName }))))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el equipo"));
  }, [load]);

  return (
    <div className="dashboard-grid">
      <h2>Documentos</h2>
      {error && <div className="error-banner">{error}</div>}

      <DocumentUploadForm recipients={workers} onUploaded={load} />
      <SentDocumentsList documents={documents} onChanged={load} />
    </div>
  );
}
