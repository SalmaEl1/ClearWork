function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Avatar por defecto: iniciales sobre un círculo de color. No hay subida
 * de foto de perfil en el alcance de este proyecto. */
export function Avatar({ fullName, size = "md" }: { fullName: string; size?: "sm" | "md" }) {
  return (
    <span className={`avatar avatar--${size}`} aria-hidden="true">
      {initials(fullName)}
    </span>
  );
}
