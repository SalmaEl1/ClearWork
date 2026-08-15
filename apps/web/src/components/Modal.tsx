import { useEffect } from "react";
import type { ReactNode } from "react";

/**
 * Diálogo modal genérico: título + contenido + botón de cierre, overlay
 * que cierra al pulsar fuera, y Escape para cerrar. No sabe nada de lo
 * que renderiza dentro — se usa para "crear cuenta", "crear proyecto",
 * y cualquier otro formulario que deba aparecer sobre la página en vez
 * de empujar el contenido.
 */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h3>{title}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
