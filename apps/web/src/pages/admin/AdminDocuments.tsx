import type { SentDocumentDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import { fetchAllAdminUsers } from "../../api/admin.js";
import { ApiError } from "../../api/client.js";
import { fetchSentDocuments } from "../../api/documents.js";
import { DocumentUploadForm } from "../../components/DocumentUploadForm.js";
import { SentDocumentsList } from "../../components/SentDocumentsList.js";

export function AdminDocuments() {
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
    fetchAllAdminUsers()
      .then((users) => setWorkers(users.filter((u) => u.role === "worker").map((u) => ({ id: u.id, fullName: u.fullName }))))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar los trabajadores"));
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
