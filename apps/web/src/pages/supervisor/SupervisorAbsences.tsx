import type { TeamScheduledAbsenceDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../../api/client.js";
import { fetchSupervisorDashboard } from "../../api/dashboard.js";
import {
  createTeamScheduledAbsence,
  deleteScheduledAbsence,
  fetchTeamScheduledAbsences,
  updateScheduledAbsence,
} from "../../api/scheduledAbsences.js";
import { ConfirmDialog } from "../../components/ConfirmDialog.js";
import { Modal } from "../../components/Modal.js";
import { Pagination } from "../../components/Pagination.js";
import { usePaginatedList } from "../../lib/usePaginatedList.js";

type TeamMemberOption = { id: string; fullName: string };

type AbsenceFormValues = {
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
};

/** A diferencia del autoservicio del trabajador (WorkerAbsences.tsx), sin
 * min en la fecha: el supervisor puede programar una ausencia en el
 * pasado (para dejar constancia de algo que ya ocurrió) o en el futuro. */
function AbsenceForm({
  members,
  initial,
  onSubmit,
  submitLabel,
}: {
  members: TeamMemberOption[];
  initial?: AbsenceFormValues;
  onSubmit: (values: AbsenceFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [userId, setUserId] = useState(initial?.userId ?? members[0]?.id ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await onSubmit({ userId, date, startTime, endTime, reason });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}
      {/* Al editar, el trabajador no cambia: para moverla a otra persona
          hay que borrarla y crear una nueva. */}
      {!initial && (
        <label>
          <span>Trabajador/a</span>
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        <span>Fecha</span>
        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label>
        <span>Desde</span>
        <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
      </label>
      <label>
        <span>Hasta</span>
        <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
      </label>
      <label>
        <span>Motivo</span>
        <input required value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <button type="submit" disabled={isSaving}>
        {isSaving ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}

export function SupervisorAbsences() {
  const [absences, setAbsences] = useState<TeamScheduledAbsenceDTO[] | null>(null);
  const [members, setMembers] = useState<TeamMemberOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<TeamScheduledAbsenceDTO | null>(null);
  const [deletingAbsence, setDeletingAbsence] = useState<TeamScheduledAbsenceDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { page, pageSize, total, pageItems, setPage, onPageSizeChange } = usePaginatedList(absences);

  const load = useCallback(() => {
    Promise.all([fetchTeamScheduledAbsences(), fetchSupervisorDashboard()])
      .then(([absenceList, dashboard]) => {
        setAbsences(absenceList);
        setMembers(dashboard.team.map((m) => ({ id: m.id, fullName: m.fullName })));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las ausencias"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(values: AbsenceFormValues) {
    await createTeamScheduledAbsence(values);
    setIsCreateOpen(false);
    load();
  }

  async function handleEdit(values: AbsenceFormValues) {
    if (!editingAbsence) return;
    await updateScheduledAbsence(editingAbsence.id, {
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime,
      reason: values.reason,
    });
    setEditingAbsence(null);
    load();
  }

  async function handleDelete() {
    if (!deletingAbsence) return;
    setError(null);
    setIsDeleting(true);
    try {
      await deleteScheduledAbsence(deletingAbsence.id);
      setDeletingAbsence(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="dashboard-grid">
      <div className="page-header">
        <h2>Ausencias del equipo</h2>
        <button type="button" onClick={() => setIsCreateOpen(true)} disabled={members.length === 0}>
          + Programar ausencia
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {!absences && !error && <p>Cargando…</p>}

      {absences && (
        <div className="card">
          {absences.length === 0 && <p>Tu equipo no tiene ausencias puntuales programadas.</p>}
          {absences.length > 0 && (
            <ul className="team-list">
              {(pageItems ?? []).map((a) => (
                <li key={a.id} className="team-list__item">
                  <span className="team-list__name">{a.userFullName}</span>
                  <span className="team-list__hours">
                    {a.date}, {a.startTime}–{a.endTime}
                  </span>
                  <span className="team-list__hours">{a.reason}</span>
                  <div className="row-actions">
                    <button type="button" className="secondary" onClick={() => setEditingAbsence(a)}>
                      Editar
                    </button>
                    <button type="button" className="secondary" onClick={() => setDeletingAbsence(a)}>
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}

      {isCreateOpen && (
        <Modal title="Programar ausencia" onClose={() => setIsCreateOpen(false)}>
          <AbsenceForm members={members} onSubmit={handleCreate} submitLabel="Programar" />
        </Modal>
      )}

      {editingAbsence && (
        <Modal
          title={`Editar ausencia: ${editingAbsence.userFullName}`}
          onClose={() => setEditingAbsence(null)}
        >
          <AbsenceForm
            members={members}
            initial={{
              userId: editingAbsence.userId,
              date: editingAbsence.date,
              startTime: editingAbsence.startTime,
              endTime: editingAbsence.endTime,
              reason: editingAbsence.reason,
            }}
            onSubmit={handleEdit}
            submitLabel="Guardar cambios"
          />
        </Modal>
      )}

      {deletingAbsence && (
        <ConfirmDialog
          title="Eliminar ausencia"
          message={`¿Eliminar la ausencia de ${deletingAbsence.userFullName} el ${deletingAbsence.date}? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          isConfirming={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeletingAbsence(null)}
        />
      )}
    </div>
  );
}
