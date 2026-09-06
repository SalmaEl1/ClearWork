import type { TeamMemberStatus, TeamMemberSummary } from "@clearwork/shared";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client.js";
import { endLeave } from "../api/leaves.js";
import { LEAVE_TYPE_LABEL } from "../constants.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { Modal } from "./Modal.js";
import { RegisterLeaveForm } from "./RegisterLeaveForm.js";

const STATUS_COPY: Record<TeamMemberStatus, { label: string; className: string }> = {
  working: { label: "Trabajando", className: "status-ok" },
  on_break: { label: "En pausa", className: "status-warning" },
  offline: { label: "Desconectado", className: "status-neutral" },
  on_leave: { label: "De baja", className: "status-neutral" },
  on_vacation: { label: "De vacaciones", className: "status-neutral" },
  on_scheduled_absence: { label: "Fuera", className: "status-neutral" },
};

const BREAK_LABEL: Record<string, string> = {
  lunch: "comida",
  ergonomic: "ergonómica",
};

export function TeamStatusList({ team, onChanged }: { team: TeamMemberSummary[]; onChanged: () => void }) {
  const [registeringFor, setRegisteringFor] = useState<TeamMemberSummary | null>(null);
  const [endingFor, setEndingFor] = useState<TeamMemberSummary | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEndLeave() {
    if (!endingFor?.leaveId) return;
    setIsEnding(true);
    setError(null);
    try {
      await endLeave(endingFor.leaveId);
      setEndingFor(null);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo finalizar la baja");
    } finally {
      setIsEnding(false);
    }
  }

  if (team.length === 0) {
    return (
      <div className="card">
        <h3>Tu equipo</h3>
        <p>Todavía no tienes trabajadores a tu cargo.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Tu equipo</h3>
      {error && <div className="error-banner">{error}</div>}
      <ul className="team-list">
        {team.map((member) => {
          const copy = STATUS_COPY[member.status];
          const balance = member.vacationBalance;
          return (
            <li key={member.id} className="team-list__item">
              <span className="team-list__name">{member.fullName}</span>
              <span className={`status-pill ${copy.className}`}>
                {copy.label}
                {member.status === "on_break" && member.breakType
                  ? ` (${BREAK_LABEL[member.breakType]})`
                  : ""}
                {member.status === "on_leave" && member.leaveType
                  ? ` (${LEAVE_TYPE_LABEL[member.leaveType]})`
                  : ""}
                {member.status === "on_scheduled_absence" && member.scheduledAbsenceReason
                  ? ` (${member.scheduledAbsenceReason})`
                  : ""}
              </span>
              <span className="team-list__hours">{member.hoursThisWeek.toFixed(1)} h esta semana</span>
              <span className="team-list__hours">
                Vacaciones {balance.year}: {balance.remaining}/{balance.total} días
              </span>
              <div className="row-actions">
                <Link to={`/supervisor/team/${member.id}/history`} className="link-button">
                  Ver historial →
                </Link>
                {member.status === "on_leave" ? (
                  <button type="button" className="secondary" onClick={() => setEndingFor(member)}>
                    Finalizar baja
                  </button>
                ) : (
                  <button type="button" className="secondary" onClick={() => setRegisteringFor(member)}>
                    Registrar baja
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {registeringFor && (
        <Modal title={`Registrar baja: ${registeringFor.fullName}`} onClose={() => setRegisteringFor(null)}>
          <RegisterLeaveForm
            userId={registeringFor.id}
            onSaved={() => {
              setRegisteringFor(null);
              onChanged();
            }}
          />
        </Modal>
      )}

      {endingFor && (
        <ConfirmDialog
          title="Finalizar baja"
          message={`¿Finalizar la baja de ${endingFor.fullName} hoy?`}
          confirmLabel="Finalizar"
          confirmingLabel="Finalizando…"
          isConfirming={isEnding}
          onConfirm={handleEndLeave}
          onCancel={() => setEndingFor(null)}
        />
      )}
    </div>
  );
}
