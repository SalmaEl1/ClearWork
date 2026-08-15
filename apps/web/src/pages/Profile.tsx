import type { MeResponse } from "@clearwork/shared";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client.js";
import { fetchCurrentUser, updateProfile } from "../api/auth.js";
import { ROLE_LABEL } from "../constants.js";

function EditProfileForm({ profile, onSaved }: { profile: MeResponse; onSaved: () => void }) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);
    try {
      await updateProfile({ fullName, email });
      setSuccess(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="card">
      <h3>Mis datos</h3>
      {error && <div className="error-banner">{error}</div>}
      {success && <div className="alert-banner status-ok">Perfil actualizado.</div>}
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          <span>Rol</span>
          <input value={ROLE_LABEL[profile.role]} disabled />
        </label>
        {profile.role === "worker" && (
          <>
            <label>
              <span>Horas objetivo semanales</span>
              <input value={`${profile.weeklyTargetHours} h`} disabled />
            </label>
            <label>
              <span>Supervisor/a</span>
              <input value={profile.supervisorName ?? "Sin asignar"} disabled />
            </label>
          </>
        )}
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}

function SecurityCard() {
  return (
    <div className="card">
      <h3>Seguridad</h3>
      <p>Cambia tu contraseña de acceso.</p>
      <Link to="/profile/password" className="link-button">
        Cambiar contraseña
      </Link>
    </div>
  );
}

export function Profile() {
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetchCurrentUser()
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar tu perfil"));
  }

  useEffect(load, []);

  return (
    <div className="dashboard-grid">
      <h2>Mi perfil</h2>
      {error && <div className="error-banner">{error}</div>}
      <div className="dashboard-grid__row">
        {profile && <EditProfileForm profile={profile} onSaved={load} />}
        <SecurityCard />
      </div>
    </div>
  );
}
