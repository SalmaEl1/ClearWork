import type { TeamTrainingAssignmentDTO, TrainingDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../../api/client.js";
import { fetchSupervisorDashboard } from "../../api/dashboard.js";
import {
  assignTraining,
  deleteTrainingAssignment,
  fetchTeamTrainingAssignments,
} from "../../api/trainingAssignments.js";
import { fetchTrainings } from "../../api/trainings.js";

function AssignTrainingForm({
  trainings,
  team,
  onSaved,
}: {
  trainings: TrainingDTO[];
  team: { id: string; fullName: string }[];
  onSaved: () => void;
}) {
  const [trainingId, setTrainingId] = useState(trainings[0]?.id ?? "");
  const [userId, setUserId] = useState(team[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // trainings/team llegan vacíos en el primer render (todavía cargando) y
  // se rellenan después: sin esto, la selección se quedaría en "" para
  // siempre, ya que useState solo lee su valor inicial una vez.
  const trainingIdsKey = trainings.map((t) => t.id).join(",");
  useEffect(() => {
    if (!trainings.some((t) => t.id === trainingId)) {
      setTrainingId(trainings[0]?.id ?? "");
    }
  }, [trainingIdsKey]);

  const teamIdsKey = team.map((w) => w.id).join(",");
  useEffect(() => {
    if (!team.some((w) => w.id === userId)) {
      setUserId(team[0]?.id ?? "");
    }
  }, [teamIdsKey]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!trainingId || !userId) return;
    setError(null);
    setIsSaving(true);
    try {
      await assignTraining({ trainingId, userId });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo asignar");
    } finally {
      setIsSaving(false);
    }
  }

  if (trainings.length === 0) {
    return (
      <div className="card">
        <h3>Asignar formación</h3>
        <p>Todavía no hay formaciones en el catálogo.</p>
      </div>
    );
  }

  if (team.length === 0) {
    return (
      <div className="card">
        <h3>Asignar formación</h3>
        <p>Todavía no tienes trabajadores a tu cargo.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Asignar formación</h3>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
        <select value={trainingId} onChange={(e) => setTrainingId(e.target.value)} style={{ flex: 1 }}>
          {trainings.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <select value={userId} onChange={(e) => setUserId(e.target.value)} style={{ flex: 1 }}>
          {team.map((w) => (
            <option key={w.id} value={w.id}>
              {w.fullName}
            </option>
          ))}
        </select>
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Asignando…" : "Asignar"}
        </button>
      </form>
    </div>
  );
}

export function SupervisorTrainings() {
  const [trainings, setTrainings] = useState<TrainingDTO[]>([]);
  const [team, setTeam] = useState<{ id: string; fullName: string }[]>([]);
  const [assignments, setAssignments] = useState<TeamTrainingAssignmentDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([fetchTrainings(), fetchSupervisorDashboard(), fetchTeamTrainingAssignments()])
      .then(([trainingList, dashboard, assignmentList]) => {
        setTrainings(trainingList);
        setTeam(dashboard.team.map((m) => ({ id: m.id, fullName: m.fullName })));
        setAssignments(assignmentList);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteTrainingAssignment(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo quitar");
    }
  }

  return (
    <div className="dashboard-grid">
      <h2>Formaciones del equipo</h2>
      {error && <div className="error-banner">{error}</div>}

      <AssignTrainingForm trainings={trainings} team={team} onSaved={load} />

      <div className="card">
        <h3>Formaciones asignadas</h3>
        {!assignments && <p>Cargando…</p>}
        {assignments && assignments.length === 0 && <p>Todavía no has asignado ninguna formación.</p>}
        {assignments && assignments.length > 0 && (
          <ul className="team-list">
            {assignments.map((a) => (
              <li key={a.id} className="team-list__item">
                <span className="team-list__name">{a.userFullName}</span>
                <span className="team-list__hours">{a.trainingTitle}</span>
                <button type="button" className="secondary" onClick={() => handleDelete(a.id)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
