import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../api/client.js";
import { createDocument } from "../api/documents.js";
import { useSavedFlash } from "../lib/useSavedFlash.js";

/**
 * Compartir un documento con uno o varios trabajadores a la vez: "de
 * forma individual" o "de forma colectiva" es, para el formulario,
 * simplemente marcar una casilla o varias — de ahí el botón de
 * "Seleccionar todos" para el caso colectivo, sin ningún camino aparte.
 */
export function DocumentUploadForm({
  recipients,
  onUploaded,
}: {
  recipients: { id: string; fullName: string }[];
  onUploaded: () => void;
}) {
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, flash] = useSavedFlash();

  const allSelected = recipients.length > 0 && recipients.every((r) => selectedIds.has(r.id));

  function toggleRecipient(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(recipients.map((r) => r.id)));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file || selectedIds.size === 0) return;
    setError(null);
    setIsSaving(true);
    try {
      await createDocument({ label, recipientIds: [...selectedIds], file });
      setLabel("");
      setFile(null);
      setSelectedIds(new Set());
      flash();
      onUploaded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo compartir el documento");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="card">
      <h3>Compartir documento</h3>
      {error && <div className="error-banner">{error}</div>}
      {justSaved && <div className="alert-banner status-ok">Documento compartido.</div>}
      <form onSubmit={handleSubmit}>
        <label>
          <span>Etiqueta</span>
          <input
            required
            placeholder="p. ej. Nómina de mayo"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label>
          <span>Archivo</span>
          <input
            type="file"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label>
          <span>Destinatarios</span>
        </label>
        {recipients.length === 0 && <p>No hay trabajadores a quien compartir documentos todavía.</p>}
        {recipients.length > 0 && (
          <>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                style={{ width: "auto" }}
                checked={allSelected}
                onChange={toggleSelectAll}
              />
              <span style={{ margin: 0 }}>Seleccionar todos (envío colectivo)</span>
            </label>
            <ul className="team-list">
              {recipients.map((r) => (
                <li key={r.id} className="team-list__item">
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                    <input
                      type="checkbox"
                      style={{ width: "auto" }}
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleRecipient(r.id)}
                    />
                    <span style={{ margin: 0 }}>{r.fullName}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
        <button
          type="submit"
          className={justSaved ? "saved" : undefined}
          disabled={isSaving || !file || selectedIds.size === 0}
        >
          {isSaving ? "Compartiendo…" : justSaved ? "✓ Compartido" : "Compartir"}
        </button>
      </form>
    </div>
  );
}
