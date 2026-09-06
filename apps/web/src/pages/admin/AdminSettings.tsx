import type { AppSettingsDTO, HolidayDTO } from "@clearwork/shared";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../../api/client.js";
import { fetchAdminSettings, updateAdminSettings } from "../../api/admin.js";
import { createHoliday, deleteHoliday, fetchHolidays } from "../../api/holidays.js";
import { ConfirmDialog } from "../../components/ConfirmDialog.js";
import { useSavedFlash } from "../../lib/useSavedFlash.js";

function GeneralSettingsCard({
  settings,
  onSaved,
}: {
  settings: AppSettingsDTO;
  onSaved: (updated: AppSettingsDTO) => void;
}) {
  const [defaultWeeklyTargetHours, setDefaultWeeklyTargetHours] = useState(
    String(settings.defaultWeeklyTargetHours),
  );
  const [excludeWeekends, setExcludeWeekends] = useState(settings.excludeWeekendsFromVacationDays);
  const [officeSeatCount, setOfficeSeatCount] = useState(String(settings.officeSeatCount));
  const [error, setError] = useState<string | null>(null);
  const [justSaved, flash] = useSavedFlash();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const updated = await updateAdminSettings({
        defaultWeeklyTargetHours: Number(defaultWeeklyTargetHours),
        excludeWeekendsFromVacationDays: excludeWeekends,
        officeSeatCount: Number(officeSeatCount),
      });
      onSaved(updated);
      flash();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: "420px" }}>
      <h3>General</h3>
      {error && <div className="error-banner">{error}</div>}
      {justSaved && <div className="alert-banner status-ok">Ajustes guardados.</div>}
      <form onSubmit={handleSubmit}>
        <label>
          <span>Horas objetivo semanales por defecto</span>
          <input
            type="number"
            min="1"
            step="0.5"
            value={defaultWeeklyTargetHours}
            onChange={(e) => setDefaultWeeklyTargetHours(e.target.value)}
          />
        </label>
        <p style={{ marginTop: "-0.5rem" }}>
          Se aplica a cualquier cuenta nueva en la que no se indique un valor propio.
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={excludeWeekends}
            onChange={(e) => setExcludeWeekends(e.target.checked)}
          />
          <span style={{ margin: 0 }}>Los fines de semana no cuentan como día de vacación</span>
        </label>
        <p style={{ marginTop: "-0.5rem" }}>
          Si se pide un rango que incluye sábado o domingo, esos días no se descuentan del saldo (y no
          se pueden elegir como inicio o fin de la solicitud).
        </p>
        <label>
          <span>Asientos disponibles en la oficina</span>
          <input
            type="number"
            min="1"
            step="1"
            value={officeSeatCount}
            onChange={(e) => setOfficeSeatCount(e.target.value)}
          />
        </label>
        <p style={{ marginTop: "-0.5rem" }}>
          Cuántos asientos numerados hay para reservar desde "Reservar sitio" (ver la vista del
          trabajador).
        </p>
        <button type="submit" className={justSaved ? "saved" : undefined} disabled={isSaving}>
          {isSaving ? "Guardando…" : justSaved ? "✓ Guardado" : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}

function HolidaysCard() {
  const year = new Date().getFullYear();
  const [holidays, setHolidays] = useState<HolidayDTO[] | null>(null);
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchHolidays(year)
      .then(setHolidays)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar los festivos"));
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await createHoliday({ date, label });
      setDate("");
      setLabel("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo añadir el festivo");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteHoliday(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card" style={{ maxWidth: "480px" }}>
      <h3>Festivos {year}</h3>
      <p>
        Los festivos nacionales de España (fecha fija) se calculan solos y no se pueden quitar; los
        personalizados los añades tú. Ninguno se puede elegir al pedir vacaciones.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {!holidays && <p>Cargando…</p>}
      {holidays && (
        <ul className="team-list">
          {holidays.map((h) => (
            <li key={h.id ?? h.date} className="team-list__item">
              <span className="team-list__name">{h.date}</span>
              <span className="team-list__hours">{h.label}</span>
              {h.isNational ? (
                <span className="status-pill status-neutral">Nacional</span>
              ) : (
                <button type="button" className="secondary" onClick={() => setDeletingId(h.id)}>
                  Eliminar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} style={{ marginTop: "1rem" }}>
        <label>
          <span>Fecha</span>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <span>Etiqueta</span>
          <input
            required
            placeholder="p. ej. Puente de la empresa"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Añadiendo…" : "Añadir festivo"}
        </button>
      </form>

      {deletingId && (
        <ConfirmDialog
          title="Eliminar festivo"
          message="¿Eliminar este festivo personalizado? A partir de ahora se podrá elegir esa fecha al pedir vacaciones."
          confirmLabel="Eliminar"
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}

export function AdminSettings() {
  const [settings, setSettings] = useState<AppSettingsDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminSettings()
      .then(setSettings)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar los ajustes"));
  }, []);

  return (
    <div className="dashboard-grid">
      <h2>Ajustes</h2>
      {error && <div className="error-banner">{error}</div>}
      {!settings && !error && <p>Cargando…</p>}

      {settings && (
        <div className="dashboard-grid__row">
          <GeneralSettingsCard settings={settings} onSaved={setSettings} />
          <HolidaysCard />
        </div>
      )}
    </div>
  );
}
