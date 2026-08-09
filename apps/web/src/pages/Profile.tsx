import type { MeResponse } from "@clearwork/shared";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../api/client.js";
import { changePassword, fetchCurrentUser } from "../api/auth.js";

const ROLE_LABEL = {
  worker: "Teletrabajador",
  supervisor: "Supervisor",
  admin: "Admin",
} as const;

function ProfileInfo({ profile }: { profile: MeResponse }) {
  return (
    <div className="card">
      <h3>Mis datos</h3>
      <dl className="profile-info">
        <dt>Nombre</dt>
        <dd>{profile.fullName}</dd>
        <dt>Email</dt>
        <dd>{profile.email}</dd>
        <dt>Rol</dt>
        <dd>{ROLE_LABEL[profile.role]}</dd>
        {profile.role === "worker" && (
          <>
            <dt>Horas objetivo semanales</dt>
            <dd>{profile.weeklyTargetHours} h</dd>
            <dt>Supervisor/a</dt>
            <dd>{profile.supervisorName ?? "Sin asignar"}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

function ChangePasswordForm() {
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
    <div className="card">
      <h3>Cambiar contraseña</h3>
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
  );
}

export function Profile() {
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser()
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar tu perfil"));
  }, []);

  return (
    <div className="dashboard-grid">
      <h2>Mi perfil</h2>
      {error && <div className="error-banner">{error}</div>}
      <div className="dashboard-grid__row">
        {profile && <ProfileInfo profile={profile} />}
        <ChangePasswordForm />
      </div>
    </div>
  );
}
