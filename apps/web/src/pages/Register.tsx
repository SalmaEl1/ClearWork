import type { Role } from "@clearwork/shared";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.js";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("worker");
  const [supervisorId, setSupervisorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({
        fullName,
        email,
        password,
        role,
        supervisorId: role === "worker" && supervisorId ? supervisorId : null,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Crear cuenta</h1>
        <p>
          {role === "worker"
            ? "Como teletrabajador, necesitas el ID de tu supervisor/a (te lo puede compartir desde su perfil)."
            : "Como supervisor/a, tu equipo usará tu ID para registrarse bajo tu cuenta."}
        </p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>
            <span>Nombre completo</span>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
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
          <label>
            <span>Contraseña</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            <span>Rol</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="worker">Teletrabajador</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </label>
          {role === "worker" && (
            <label>
              <span>ID de tu supervisor/a (opcional por ahora)</span>
              <input
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </label>
          )}
          <button type="submit" disabled={isSubmitting} style={{ width: "100%" }}>
            {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>

        <div className="auth-card__footer">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
}
