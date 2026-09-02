import { useState } from "react";
import { todayDateString } from "../lib/dates.js";

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Mini calendario de un mes, para elegir días sueltos (no un rango): se
 * clica cada día que se quiere, uno a uno, y se marcan como seleccionados.
 * La navegación no sale del año en curso — no tendría sentido pedir
 * vacaciones de otro año — y los días ya pasados no se pueden elegir.
 */
export function MiniCalendar({
  selectedDates,
  onToggleDate,
}: {
  selectedDates: Set<string>;
  onToggleDate: (date: string) => void;
}) {
  const today = todayDateString();
  const currentYear = new Date().getFullYear();
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth());

  const firstOfMonth = new Date(currentYear, monthIndex, 1);
  const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // lunes = 0

  const cells: (string | null)[] = Array.from({ length: startWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${currentYear}-${pad(monthIndex + 1)}-${pad(day)}`);
  }

  return (
    <div className="mini-calendar">
      <div className="mini-calendar__header">
        <button
          type="button"
          className="secondary"
          disabled={monthIndex === 0}
          onClick={() => setMonthIndex((m) => m - 1)}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <strong>
          {MONTH_LABELS[monthIndex]} {currentYear}
        </strong>
        <button
          type="button"
          className="secondary"
          disabled={monthIndex === 11}
          onClick={() => setMonthIndex((m) => m + 1)}
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
          const isPast = iso < today;
          const isSelected = selectedDates.has(iso);
          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              aria-pressed={isSelected}
              className={`mini-calendar__day${isSelected ? " mini-calendar__day--selected" : ""}`}
              onClick={() => onToggleDate(iso)}
            >
              {Number(iso.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
