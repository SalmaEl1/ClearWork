/** weekEnd es el lunes siguiente (límite exclusivo, ver dashboard/service.ts
 * en el backend): el último día real que se muestra es un día antes. Se
 * formatea en UTC a propósito, para que coincida con los límites de semana
 * que calcula el backend (también en UTC) sin desplazarse según la zona
 * horaria de quien lo mira. */
function formatWeekRange(weekStartIso: string, weekEndIso: string): string {
  const start = new Date(weekStartIso);
  const end = new Date(weekEndIso);
  end.setUTCDate(end.getUTCDate() - 1);
  const format = (d: Date) =>
    d.toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${format(start)} – ${format(end)}`;
}

/** Navegación de semana compartida por el dashboard del trabajador y el
 * del supervisor. `weekOffset` es 0 para la semana actual y negativo para
 * semanas pasadas — nunca se puede avanzar a una semana futura. */
export function WeekNav({
  weekOffset,
  onChange,
  weekStart,
  weekEnd,
}: {
  weekOffset: number;
  onChange: (weekOffset: number) => void;
  weekStart?: string;
  weekEnd?: string;
}) {
  return (
    <div className="week-nav">
      <button type="button" className="secondary" onClick={() => onChange(weekOffset - 1)}>
        ← Semana anterior
      </button>
      <span className="week-nav__label">
        {weekStart && weekEnd ? formatWeekRange(weekStart, weekEnd) : "…"}
        {weekOffset === 0 && " (actual)"}
      </span>
      <button
        type="button"
        className="secondary"
        disabled={weekOffset >= 0}
        onClick={() => onChange(weekOffset + 1)}
      >
        Semana siguiente →
      </button>
    </div>
  );
}
