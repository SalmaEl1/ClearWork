import type { TeamMemberStatus, TeamMemberSummary } from "@clearwork/shared";

const STATUS_COPY: Record<TeamMemberStatus, { label: string; className: string }> = {
  working: { label: "Trabajando", className: "status-ok" },
  on_break: { label: "En pausa", className: "status-warning" },
  offline: { label: "Desconectado", className: "status-neutral" },
};

const BREAK_LABEL: Record<string, string> = {
  lunch: "comida",
  ergonomic: "ergonómica",
};

export function TeamStatusList({ team }: { team: TeamMemberSummary[] }) {
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
      <ul className="team-list">
        {team.map((member) => {
          const copy = STATUS_COPY[member.status];
          return (
            <li key={member.id} className="team-list__item">
              <span className="team-list__name">{member.fullName}</span>
              <span className={`status-pill ${copy.className}`}>
                {copy.label}
                {member.status === "on_break" && member.breakType
                  ? ` (${BREAK_LABEL[member.breakType]})`
                  : ""}
              </span>
              <span className="team-list__hours">{member.hoursThisWeek.toFixed(1)} h esta semana</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
