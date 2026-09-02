import type { AppSettingsDTO } from "@clearwork/shared";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../../api/client.js";
import { fetchAdminSettings, updateAdminSettings } from "../../api/admin.js";

export function AdminSettings() {
  const [settings, setSettings] = useState<AppSettingsDTO | null>(null);
  const [defaultWeeklyTargetHours, setDefaultWeeklyTargetHours] = useState("40");
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAdminSettings()
      .then((s) => {
        setSettings(s);
        setDefaultWeeklyTargetHours(String(s.defaultWeeklyTargetHours));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar los ajustes"));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSavedMessage(null);
    setIsSaving(true);
    try {
      const updated = await updateAdminSettings({
        defaultWeeklyTargetHours: Number(defaultWeeklyTargetHours),
      });
      setSettings(updated);
      setSavedMessage("Ajustes guardados.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="dashboard-grid">
      <h2>Ajustes</h2>
      {error && <div className="error-banner">{error}</div>}
      {!settings && !error && <p>Cargando…</p>}

      {settings && (
        <div className="card" style={{ maxWidth: "420px" }}>
          <h3>Cuentas nuevas</h3>
          {savedMessage && <div className="alert-banner status-ok">{savedMessage}</div>}
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
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
