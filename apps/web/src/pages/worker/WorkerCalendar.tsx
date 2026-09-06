import type { HolidayDTO, LeaveDTO, ScheduledAbsenceDTO, VacationRequestDTO } from "@clearwork/shared";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext.js";
import { ApiError } from "../../api/client.js";
import { fetchHolidays } from "../../api/holidays.js";
import { fetchLeaves } from "../../api/leaves.js";
import { fetchMyScheduledAbsences } from "../../api/scheduledAbsences.js";
import { fetchMyVacationRequests } from "../../api/vacations.js";
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
  { className: "status-danger", label: "Baja" },
  { className: "status-ok", label: "Vacaciones" },
  { className: "status-warning", label: "Ausencia puntual" },
  { className: "status-neutral", label: "Festivo" },
];

/**
 * Calendario personal del trabajador: un mes a la vez, con cada día
 * coloreado según lo más específico que le pase ese día (baja > vacación
 * > ausencia puntual > festivo — mismo orden de prioridad que el estado
 * del equipo en el dashboard del supervisor). Solo de lectura: para
 * pedir o gestionar cada cosa está su propia pantalla.
 */
export function WorkerCalendar() {
  const { user } = useAuth();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [holidays, setHolidays] = useState<HolidayDTO[]>([]);
  const [leaves, setLeaves] = useState<LeaveDTO[]>([]);
  const [absences, setAbsences] = useState<ScheduledAbsenceDTO[]>([]);
  const [vacations, setVacations] = useState<VacationRequestDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  useEffect(() => {
    if (!user) return;
    fetchHolidays(year)
      .then(setHolidays)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar los festivos"));
    fetchLeaves(user.id)
      .then(setLeaves)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las bajas"));
    fetchMyScheduledAbsences()
      .then(setAbsences)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las ausencias"));
    fetchMyVacationRequests()
      .then(setVacations)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las vacaciones"));
  }, [user, year]);

  const dayEntryFor = useMemo(() => {
    return (date: string): DayEntry | undefined => {
      const leave = leaves.find((l) => date >= l.startDate && (l.endDate === null || date <= l.endDate));
      if (leave) return { className: "status-danger", label: `Baja: ${LEAVE_TYPE_LABEL[leave.type]}` };

      const vacation = vacations.find(
        (v) => v.status !== "rejected" && v.status !== "cancelled" && date >= v.startDate && date <= v.endDate,
      );
      if (vacation) {
        return { className: "status-ok", label: `Vacaciones (${VACATION_STATUS_LABEL[vacation.status]})` };
      }

      const absence = absences.find((a) => a.date === date);
      if (absence) return { className: "status-warning", label: `Ausencia puntual: ${absence.reason}` };

      const holiday = holidays.find((h) => h.date === date);
      if (holiday) return { className: "status-neutral", label: `Festivo: ${holiday.label}` };

      return undefined;
    };
  }, [leaves, vacations, absences, holidays]);

  const today = todayDateString();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // lunes = 0

  const cells: (string | null)[] = Array.from({ length: startWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${year}-${pad(month + 1)}-${pad(day)}`);
  }

  return (
    <div className="dashboard-grid">
      <h2>Mi calendario</h2>
      {error && <div className="error-banner">{error}</div>}

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
    </div>
  );
}
