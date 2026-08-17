import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client.js";
import { resetPassword } from "../api/auth.js";

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Las dos contraseñas no coinciden");
      return;
    }
    setIsSubmitting(true);
    try {
      await resetPassword({ token, newPassword });
      setIsDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>ClearWork</h1>

        {!token && (
          <div className="error-banner">
            Este enlace no es válido. Pide uno nuevo desde "¿Olvidaste tu contraseña?".
          </div>
        )}

        {token && isDone && (
          <>
            <div className="alert-banner status-ok">Contraseña actualizada.</div>
            <div className="auth-card__footer">
              <Link to="/login">Iniciar sesión</Link>
            </div>
          </>
        )}

        {token && !isDone && (
          <>
            <p>Elige tu nueva contraseña.</p>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={handleSubmit}>
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
                <span>Repite la contraseña</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </label>
              <button type="submit" disabled={isSubmitting} style={{ width: "100%" }}>
                {isSubmitting ? "Guardando…" : "Cambiar contraseña"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
