import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../api/client.js";
import { changePassword } from "../api/auth.js";
import { BackLink } from "../components/BackLink.js";

export function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("La contraseña nueva no coincide con la confirmación");
      return;
    }

    if (newPassword === currentPassword) {
      setError("La contraseña nueva debe ser distinta a la actual");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="dashboard-grid">
      <div>
        <BackLink to="/profile">Volver a mi perfil</BackLink>
      </div>
      <h2>Cambiar contraseña</h2>

      <div className="card" style={{ maxWidth: "420px" }}>
        {error && <div className="error-banner">{error}</div>}
        {success && <div className="alert-banner status-ok">Contraseña actualizada.</div>}
        <form onSubmit={handleSubmit}>
          <label>
            <span>Contraseña actual</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label>
            <span>Contraseña nueva</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <label>
            <span>Confirmar contraseña nueva</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : "Cambiar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
