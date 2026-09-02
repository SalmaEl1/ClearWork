import type { NotificationChannel, NotificationPreferenceDTO, NotificationType } from "@clearwork/shared";
import { NOTIFICATION_CHANNELS } from "@clearwork/shared";
import { useEffect, useState } from "react";
import { ApiError } from "../api/client.js";
import { fetchNotificationPreferences, updateNotificationPreference } from "../api/notificationPreferences.js";
import { BackLink } from "../components/BackLink.js";
import { NOTIFICATION_CHANNEL_LABEL, NOTIFICATION_TYPE_LABEL } from "../constants.js";
import { useSavedConfirmation } from "../lib/useSavedConfirmation.js";

/** Preferencias de notificación (issue #112): por cada tipo, por dónde
 * quiere recibirla quien ha entrado — dentro de la plataforma, por
 * correo, ambas cosas, o ninguna. Sustituye el comportamiento anterior,
 * en el que el medio de cada tipo estaba fijado en el código del
 * backend (ver api/src/shared/notifications.ts). */
export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferenceDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingType, setSavingType] = useState<NotificationType | null>(null);
  const [isSaved, triggerSaved] = useSavedConfirmation();

  useEffect(() => {
    fetchNotificationPreferences()
      .then(setPreferences)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las preferencias"));
  }, []);

  async function handleChange(type: NotificationType, channel: NotificationChannel) {
    setError(null);
    setSavingType(type);
    try {
      const updated = await updateNotificationPreference(type, channel);
      setPreferences((prev) => prev?.map((p) => (p.type === type ? updated : p)) ?? prev);
      triggerSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la preferencia");
    } finally {
      setSavingType(null);
    }
  }

  return (
    <div className="dashboard-grid">
      <div>
        <BackLink to="/profile">Volver a mi perfil</BackLink>
      </div>
      <h2>Notificaciones</h2>
      {error && <div className="error-banner">{error}</div>}
      {isSaved && <div className="alert-banner status-ok">Preferencia guardada.</div>}
      {!preferences && !error && <p>Cargando…</p>}

      {preferences && (
        <div className="card">
          <p>Elija, para cada tipo de aviso, por dónde quiere recibirlo.</p>
          <ul className="team-list">
            {preferences.map((pref) => (
              <li key={pref.type} className="team-list__item">
                <span className="team-list__name">{NOTIFICATION_TYPE_LABEL[pref.type]}</span>
                <select
                  aria-label={`Medio para: ${NOTIFICATION_TYPE_LABEL[pref.type]}`}
                  value={pref.channel}
                  disabled={savingType === pref.type}
                  onChange={(e) => handleChange(pref.type, e.target.value as NotificationChannel)}
                >
                  {NOTIFICATION_CHANNELS.map((channel) => (
                    <option key={channel} value={channel}>
                      {NOTIFICATION_CHANNEL_LABEL[channel]}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
