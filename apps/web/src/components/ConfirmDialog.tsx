import { Modal } from "./Modal.js";

/**
 * Modal propio para confirmar acciones destructivas (sustituye al
 * confirm() nativo del navegador, que desentona con el resto del panel).
 * Sin estado propio: quien lo usa decide cuándo mostrarlo (isConfirmOpen
 * local) y qué hacer al confirmar, igual que ya se hace con Modal.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isConfirming = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p style={{ marginBottom: "1.25rem" }}>{message}</p>
      <div className="modal__actions">
        <button type="button" className="secondary" disabled={isConfirming} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className="danger" disabled={isConfirming} onClick={onConfirm}>
          {isConfirming ? "Eliminando…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
