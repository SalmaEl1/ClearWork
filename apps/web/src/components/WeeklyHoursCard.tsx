import type { WeeklyHoursStatus } from "@clearwork/shared";

const STATUS_COPY: Record<WeeklyHoursStatus, { label: string; className: string }> = {
  ok: { label: "Dentro de tu objetivo", className: "status-ok" },
  near_limit: { label: "Cerca de tu objetivo semanal", className: "status-warning" },
  over_limit: { label: "Has superado tu objetivo semanal", className: "status-danger" },
};

function formatHours(hours: number): string {
  return `${hours.toFixed(1)} h`;
}

export function WeeklyHoursCard({
  workedHours,
  targetHours,
  status,
}: {
  workedHours: number;
  targetHours: number;
  status: WeeklyHoursStatus;
}) {
  const ratio = targetHours > 0 ? Math.min(workedHours / targetHours, 1) : 0;
  const copy = STATUS_COPY[status];

  return (
    <div className="card">
      <h3>Horas esta semana</h3>
      <p className="weekly-hours__figure">
        {formatHours(workedHours)} <span>/ {formatHours(targetHours)} objetivo</span>
      </p>
      <div className="progress-bar">
        <div className={`progress-bar__fill ${copy.className}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      {status !== "ok" && <div className={`alert-banner ${copy.className}`}>{copy.label}</div>}
    </div>
  );
}
