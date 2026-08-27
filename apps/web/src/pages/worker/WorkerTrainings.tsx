import type { MyTrainingAssignmentDTO } from "@clearwork/shared";
import { useEffect, useState } from "react";
import { ApiError } from "../../api/client.js";
import { fetchMyTrainingAssignments } from "../../api/trainingAssignments.js";

export function WorkerTrainings() {
  const [assignments, setAssignments] = useState<MyTrainingAssignmentDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyTrainingAssignments()
      .then(setAssignments)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las formaciones"));
  }, []);

  return (
    <div className="dashboard-grid">
      <h2>Mis formaciones</h2>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {!assignments && <p>Cargando…</p>}
        {assignments && assignments.length === 0 && <p>Todavía no tienes formaciones asignadas.</p>}
        {assignments && assignments.length > 0 && (
          <ul className="team-list">
            {assignments.map((a) => (
              <li key={a.id} className="team-list__item">
                <span className="team-list__name">{a.trainingTitle}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
