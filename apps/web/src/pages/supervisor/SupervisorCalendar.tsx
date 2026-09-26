import type {
  HolidayDTO,
  TeamLeaveDTO,
  TeamMemberSummary,
  TeamScheduledAbsenceDTO,
  TeamVacationRequestDTO,
} from "@clearwork/shared";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/client.js";
import { fetchSupervisorDashboard } from "../../api/dashboard.js";
import { fetchHolidays } from "../../api/holidays.js";
import { fetchTeamLeaves } from "../../api/leaves.js";
import { fetchTeamScheduledAbsences } from "../../api/scheduledAbsences.js";
import { fetchTeamVacationRequests } from "../../api/vacations.js";
import { LEAVE_TYPE_LABEL, VACATION_STATUS_LABEL } from "../../constants.js";
import { todayDateString } from "../../lib/dates.js";

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

type DayEntry = { className: string; label: string };

const LEGEND: { className: string; label: string }[] = [
  { className: "status-danger", label: "Baja/permiso" },
  { className: "status-ok", label: "Vacaciones" },
  { className: "status-warning", label: "Ausencia puntual" },
  { className: "status-neutral", label: "Festivo" },
];

/**
 * Calendario del equipo del supervisor (issue #134): mismo criterio de
 * prioridad por día que WorkerCalendar.tsx (baja/permiso > vacación >
 * ausencia puntual > festivo), pero agregado sobre todo el equipo o
 * acotado a una persona con el desplegable. En "todo el equipo", una
 * celda se colorea si CUALQUIERA tiene algo ese día — quién y qué se
 * distingue en la lista de eventos de al lado, no en la rejilla.
 */
export function SupervisorCalendar() {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [team, setTeam] = useState<TeamMemberSummary[]>([]);
  const [memberFilter, setMemberFilter] = useState<"all" | string>("all");
  const [holidays, setHolidays] = useState<HolidayDTO[]>([]);
  const [leaves, setLeaves] = useState<TeamLeaveDTO[]>([]);
  const [absences, setAbsences] = useState<TeamScheduledAbsenceDTO[]>([]);
  const [vacations, setVacations] = useState<TeamVacationRequestDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  useEffect(() => {
    fetchSupervisorDashboard()
      .then((dashboard) => setTeam(dashboard.team))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el equipo"));
    fetchTeamLeaves()
      .then(setLeaves)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las bajas/permisos"));
    fetchTeamScheduledAbsences()
      .then(setAbsences)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las ausencias"));
    fetchTeamVacationRequests()
      .then(setVacations)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las vacaciones"));
  }, []);

  useEffect(() => {
    fetchHolidays(year)
      .then(setHolidays)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar los festivos"));
  }, [year]);

  const filteredLeaves = useMemo(
    () => (memberFilter === "all" ? leaves : leaves.filter((l) => l.userId === memberFilter)),
    [leaves, memberFilter],
  );
  const filteredVacations = useMemo(
    () =>
      (memberFilter === "all" ? vacations : vacations.filter((v) => v.userId === memberFilter)).filter(
        (v) => v.status !== "rejected" && v.status !== "cancelled",
      ),
    [vacations, memberFilter],
  );
  const filteredAbsences = useMemo(
    () => (memberFilter === "all" ? absences : absences.filter((a) => a.userId === memberFilter)),
    [absences, memberFilter],
  );

  const dayEntryFor = useMemo(() => {
    return (date: string): DayEntry | undefined => {
      const leave = filteredLeaves.find((l) => date >= l.startDate && (l.endDate === null || date <= l.endDate));
      if (leave) {
        return {
          className: "status-danger",
          label: `${leave.userFullName} — Baja/permiso: ${LEAVE_TYPE_LABEL[leave.type]}`,
        };
      }

      const vacation = filteredVacations.find((v) => date >= v.startDate && date <= v.endDate);
      if (vacation) {
        return {
          className: "status-ok",
          label: `${vacation.userFullName} — Vacaciones (${VACATION_STATUS_LABEL[vacation.status]})`,
        };
      }

      const absence = filteredAbsences.find((a) => a.date === date);
      if (absence) {
        return { className: "status-warning", label: `${absence.userFullName} — Ausencia puntual: ${absence.reason}` };
      }

      const holiday = holidays.find((h) => h.date === date);
      if (holiday) return { className: "status-neutral", label: `Festivo: ${holiday.label}` };

      return undefined;
    };
  }, [filteredLeaves, filteredVacations, filteredAbsences, holidays]);

  const today = todayDateString();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = (firstOfMonth.getDay() + 6) % 7;

  const monthStart = `${year}-${pad(month + 1)}-01`;
  const monthEnd = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;

  type MonthEvent = { key: string; range: string; className: string; label: string };

  const monthEvents = useMemo<MonthEvent[]>(() => {
    const events: MonthEvent[] = [];

    for (const l of filteredLeaves) {
      if (l.startDate > monthEnd || (l.endDate !== null && l.endDate < monthStart)) continue;
      const range = l.startDate === l.endDate ? l.startDate : `${l.startDate} – ${l.endDate ?? "actualidad"}`;
      events.push({
        key: `leave-${l.id}`,
        range,
        className: "status-danger",
        label: `${l.userFullName} — Baja/permiso: ${LEAVE_TYPE_LABEL[l.type]}`,
      });
    }

    for (const v of filteredVacations) {
      if (v.startDate > monthEnd || v.endDate < monthStart) continue;
      events.push({
        key: `vacation-${v.id}`,
        range: v.startDate === v.endDate ? v.startDate : `${v.startDate} – ${v.endDate}`,
        className: "status-ok",
        label: `${v.userFullName} — Vacaciones (${VACATION_STATUS_LABEL[v.status]})`,
      });
    }

    for (const a of filteredAbsences) {
      if (a.date < monthStart || a.date > monthEnd) continue;
      events.push({
        key: `absence-${a.id}`,
        range: a.date,
        className: "status-warning",
        label: `${a.userFullName} — Ausencia puntual: ${a.reason}`,
      });
    }

    for (const h of holidays) {
      if (h.date < monthStart || h.date > monthEnd) continue;
      events.push({ key: `holiday-${h.date}`, range: h.date, className: "status-neutral", label: `Festivo: ${h.label}` });
    }

    return events.sort((a, b) => a.range.localeCompare(b.range));
  }, [filteredLeaves, filteredVacations, filteredAbsences, holidays, monthStart, monthEnd]);

  const cells: (string | null)[] = Array.from({ length: startWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${year}-${pad(month + 1)}-${pad(day)}`);
  }

  return (
    <div className="dashboard-grid">
      <div className="page-header">
        <h2>Calendario del equipo</h2>
        <label>
          <span>Persona</span>
          <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
            <option value="all">Todo el equipo</option>
            {team.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="worker-calendar__layout">
      <div className="card">
        <div className="mini-calendar">
          <div className="mini-calendar__header">
            <button
              type="button"
              className="secondary"
              onClick={() => setMonthDate(new Date(year, month - 1, 1))}
              aria-label="Mes anterior"
            >
              ‹
            </button>
            <strong>
              {MONTH_LABELS[month]} {year}
            </strong>
            <button
              type="button"
              className="secondary"
              onClick={() => setMonthDate(new Date(year, month + 1, 1))}
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>
          <div className="mini-calendar__grid">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className="mini-calendar__weekday">
                {label}
              </span>
            ))}
            {cells.map((iso, index) => {
              if (!iso) return <span key={`empty-${index}`} />;
              const entry = dayEntryFor(iso);
              const isToday = iso === today;
              return (
                <span
                  key={iso}
                  title={entry?.label}
                  className={`mini-calendar__day worker-calendar__day${entry ? ` ${entry.className}` : ""}${isToday ? " worker-calendar__day--today" : ""}`}
                >
                  {Number(iso.slice(8, 10))}
                </span>
              );
            })}
          </div>
        </div>

        <div className="worker-calendar__legend">
          {LEGEND.map((item) => (
            <span key={item.label} className="worker-calendar__legend-item">
              <span className={`worker-calendar__legend-swatch ${item.className}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>
          Eventos de {MONTH_LABELS[month]} {year}
        </h3>
        {monthEvents.length === 0 && <p>No hay eventos este mes.</p>}
        {monthEvents.length > 0 && (
          <ul className="team-list">
            {monthEvents.map((event) => (
              <li key={event.key} className="team-list__item">
                <span className={`worker-calendar__legend-swatch ${event.className}`} style={{ marginRight: "0.5rem" }} />
                <span className="team-list__name">{event.label}</span>
                <span className="team-list__hours">{event.range}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>
    </div>
  );
}
