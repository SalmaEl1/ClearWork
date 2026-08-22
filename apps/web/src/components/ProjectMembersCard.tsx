import type { ProjectDetailDTO } from "@clearwork/shared";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../api/client.js";

type AssignableWorker = {
  id: string;
  fullName: string;
  currentProjectName: string | null;
};

/**
 * Compartido entre AdminProjectDetail y SupervisorProjectDetail: la gestión
 * de miembros es idéntica en ambos paneles, solo cambia qué endpoint llaman
 * onAssign/onRemove (proyectos de admin vs. "mis proyectos" de supervisor).
 */
export function ProjectMembersCard({
  project,
  workers,
  onAssign,
  onRemove,
  onChanged,
}: {
  project: ProjectDetailDTO;
  workers: AssignableWorker[];
  onAssign: (userId: string) => Promise<unknown>;
  onRemove: (userId: string) => Promise<unknown>;
  onChanged: () => void;
}) {
  const memberIds = new Set(project.members.map((m) => m.userId));
  const available = workers.filter((w) => !memberIds.has(w.id));
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Si la selección actual ya no está disponible (recién asignada, o la
  // lista todavía no había cargado cuando se montó el componente), se
  // recoloca sobre el primer disponible en vez de quedarse congelada.
  const availableIdsKey = available.map((w) => w.id).join(",");
  useEffect(() => {
    if (!available.some((w) => w.id === selectedWorkerId)) {
      setSelectedWorkerId(available[0]?.id ?? "");
    }
  }, [availableIdsKey]);

  async function handleAssign(event: FormEvent) {
    event.preventDefault();
    if (!selectedWorkerId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onAssign(selectedWorkerId);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo asignar");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(userId: string) {
    setError(null);
    try {
      await onRemove(userId);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo quitar");
    }
  }

  return (
    <div className="card">
      <h3>Miembros ({project.members.length})</h3>
      {error && <div className="error-banner">{error}</div>}

      {project.members.length === 0 && <p>Todavía no hay trabajadores en este proyecto.</p>}
      {project.members.length > 0 && (
        <ul className="team-list">
          {project.members.map((m) => (
            <li key={m.userId} className="team-list__item">
              <span className="team-list__name">{m.fullName}</span>
              <button type="button" className="secondary" onClick={() => handleRemove(m.userId)}>
                Quitar del proyecto
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAssign} style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
        <select
          value={selectedWorkerId}
          onChange={(e) => setSelectedWorkerId(e.target.value)}
          style={{ flex: 1 }}
        >
          {available.length === 0 && <option value="">No hay trabajadores disponibles</option>}
          {available.map((w) => (
            <option key={w.id} value={w.id}>
              {w.fullName} {w.currentProjectName ? `(en ${w.currentProjectName})` : "(sin proyecto)"}
            </option>
          ))}
        </select>
        <button type="submit" disabled={isSubmitting || !selectedWorkerId}>
          Asignar
        </button>
      </form>
    </div>
  );
}
