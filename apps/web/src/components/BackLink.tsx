import { Link } from "react-router-dom";
import type { ReactNode } from "react";

/** Enlace "← Volver a…" con aspecto de control, no de texto suelto.
 * Se usa en cualquier página de detalle que cuelgue de un listado. */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="back-link">
      <span aria-hidden="true">←</span> {children}
    </Link>
  );
}
