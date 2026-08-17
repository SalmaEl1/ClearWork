import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client.js";
import { forgotPassword } from "../api/auth.js";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await forgotPassword({ email });
      // Se muestra el mismo mensaje exista o no la cuenta: el backend
      // responde igual a propósito (ver auth/service.ts), así que el
      // frontend tampoco puede distinguir un caso del otro.
      setIsSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo procesar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>ClearWork</h1>
        <p>Te mandamos un enlace para elegir una contraseña nueva.</p>

        {error && <div className="error-banner">{error}</div>}

        {isSent ? (
          <div className="alert-banner status-ok">
            Si esa cuenta existe, te hemos enviado un correo con el enlace. Revisa también spam.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button type="submit" disabled={isSubmitting} style={{ width: "100%" }}>
              {isSubmitting ? "Enviando…" : "Enviar enlace"}
            </button>
          </form>
        )}

        <div className="auth-card__footer">
          <Link to="/login">Volver a iniciar sesión</Link>
        </div>
      </div>
    </div>
  );
}
