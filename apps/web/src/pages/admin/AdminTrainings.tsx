import type { TrainingDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../../api/client.js";
import { createTraining, deleteTraining, fetchTrainings } from "../../api/trainings.js";

function NewTrainingForm({ onSaved }: { onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await createTraining({ title });
      setTitle("");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="card">
      <h3>Nueva formación</h3>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          required
          placeholder="Título de la formación"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Creando…" : "Crear"}
        </button>
      </form>
    </div>
  );
}

export function AdminTrainings() {
  const [trainings, setTrainings] = useState<TrainingDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchTrainings()
      .then(setTrainings)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el catálogo"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteTraining(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
    }
  }

  return (
    <div className="dashboard-grid">
      <h2>Catálogo de formaciones</h2>
      {error && <div className="error-banner">{error}</div>}

      <NewTrainingForm onSaved={load} />

      <div className="card">
        <h3>Formaciones ({trainings?.length ?? 0})</h3>
        {!trainings && <p>Cargando…</p>}
        {trainings && trainings.length === 0 && <p>Todavía no hay formaciones en el catálogo.</p>}
        {trainings && trainings.length > 0 && (
          <ul className="team-list">
            {trainings.map((t) => (
              <li key={t.id} className="team-list__item">
                <span className="team-list__name">{t.title}</span>
                <button type="button" className="secondary" onClick={() => handleDelete(t.id)}>
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
