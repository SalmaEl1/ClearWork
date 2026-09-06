import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentUploadForm } from "../../src/components/DocumentUploadForm.js";

/** jsdom bloquea el evento "submit" nativo si un <input required> (aquí,
 * el de tipo "file") no pasa su validación de HTML5 — algo que
 * userEvent.click en el botón respeta, aunque el estado de React ya sea
 * válido. Disparar el submit directamente sortea esa validación nativa,
 * igual que el resto de inputs nativos "raros" en esta suite (ver
 * fireEvent.change para fecha/hora en vez de userEvent.type). */
function submitForm(): void {
  const form = screen.getByRole("button", { name: "Compartir" }).closest("form");
  fireEvent.submit(form!);
}

const createDocument = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/documents.js", () => ({ createDocument }));

const recipients = [
  { id: "u1", fullName: "Juan Worker" },
  { id: "u2", fullName: "Laura Worker" },
];

function makeFile(): File {
  return new File(["contenido"], "nomina.pdf", { type: "application/pdf" });
}

describe("DocumentUploadForm", () => {
  beforeEach(() => {
    createDocument.mockReset().mockResolvedValue({});
  });

  it("muestra el estado vacío cuando no hay destinatarios", () => {
    render(<DocumentUploadForm recipients={[]} onUploaded={vi.fn()} />);
    expect(
      screen.getByText("No hay trabajadores a quien compartir documentos todavía."),
    ).toBeInTheDocument();
  });

  it("el botón de compartir empieza deshabilitado sin archivo ni destinatario", () => {
    render(<DocumentUploadForm recipients={recipients} onUploaded={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Compartir" })).toBeDisabled();
  });

  it("comparte con un solo destinatario elegido individualmente", async () => {
    const user = userEvent.setup();
    const onUploaded = vi.fn();
    render(<DocumentUploadForm recipients={recipients} onUploaded={onUploaded} />);

    await user.type(screen.getByPlaceholderText("p. ej. Nómina de mayo"), "Nómina de mayo");
    await user.upload(screen.getByLabelText("Archivo"), makeFile());
    expect((screen.getByLabelText("Archivo") as HTMLInputElement).files).toHaveLength(1);
    await user.click(screen.getByLabelText("Juan Worker"));
    expect(screen.getByLabelText("Juan Worker")).toBeChecked();
    expect(screen.getByRole("button", { name: "Compartir" })).not.toBeDisabled();
    submitForm();

    await waitFor(() =>
      expect(createDocument).toHaveBeenCalledWith({
        label: "Nómina de mayo",
        recipientIds: ["u1"],
        file: expect.any(File),
      }),
    );
    expect(onUploaded).toHaveBeenCalledTimes(1);
  });

  it("'Seleccionar todos' marca a todo el mundo para un envío colectivo", async () => {
    const user = userEvent.setup();
    render(<DocumentUploadForm recipients={recipients} onUploaded={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("p. ej. Nómina de mayo"), "Política de empresa");
    await user.upload(screen.getByLabelText("Archivo"), makeFile());
    await user.click(screen.getByLabelText("Seleccionar todos (envío colectivo)"));
    submitForm();

    await waitFor(() =>
      expect(createDocument).toHaveBeenCalledWith({
        label: "Política de empresa",
        recipientIds: ["u1", "u2"],
        file: expect.any(File),
      }),
    );
  });
});
