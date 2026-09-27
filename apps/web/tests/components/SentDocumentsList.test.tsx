import type { SentDocumentDTO } from "@clearwork/shared";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { SentDocumentsList } from "../../src/components/SentDocumentsList.js";

const deleteDocument = vi.hoisted(() => vi.fn());
const downloadDocument = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/documents.js", () => ({ deleteDocument, downloadDocument }));

function doc(overrides: Partial<SentDocumentDTO> = {}): SentDocumentDTO {
  return {
    id: "d1",
    label: "Nómina de mayo",
    originalName: "nomina.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2048,
    uploaderName: "Ana Admin",
    createdAt: "2026-05-01T00:00:00.000Z",
    recipients: [{ userId: "u1", fullName: "Juan Worker" }],
    ...overrides,
  };
}

describe("SentDocumentsList", () => {
  beforeEach(() => {
    deleteDocument.mockReset().mockResolvedValue(undefined);
    downloadDocument.mockReset().mockResolvedValue(undefined);
  });

  it("muestra 'Cargando…' mientras los documentos son null", () => {
    render(<SentDocumentsList documents={null} onChanged={vi.fn()} />);
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("muestra el tamaño en B para documentos pequeños", () => {
    render(<SentDocumentsList documents={[doc({ sizeBytes: 500 })]} onChanged={vi.fn()} />);
    expect(screen.getByText(/500 B/)).toBeInTheDocument();
  });

  it("muestra el estado vacío", () => {
    render(<SentDocumentsList documents={[]} onChanged={vi.fn()} />);
    expect(screen.getByText("Todavía no has compartido ningún documento.")).toBeInTheDocument();
  });

  it("lista los destinatarios de cada documento", () => {
    render(<SentDocumentsList documents={[doc()]} onChanged={vi.fn()} />);
    expect(screen.getByText(/Juan Worker/)).toBeInTheDocument();
  });

  it("elimina un documento tras confirmar", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<SentDocumentsList documents={[doc()]} onChanged={onChanged} />);

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(deleteDocument).toHaveBeenCalledWith("d1"));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("descarga un documento al pinchar en Descargar", async () => {
    const user = userEvent.setup();
    render(<SentDocumentsList documents={[doc()]} onChanged={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Descargar" }));

    await waitFor(() => expect(downloadDocument).toHaveBeenCalledWith("d1", "nomina.pdf"));
  });

  it("muestra el tamaño en MB para documentos grandes", () => {
    render(<SentDocumentsList documents={[doc({ sizeBytes: 5 * 1024 * 1024 })]} onChanged={vi.fn()} />);
    expect(screen.getByText(/5\.0 MB/)).toBeInTheDocument();
  });

  it("cancela el borrado de un documento sin eliminarlo", async () => {
    const user = userEvent.setup();
    render(<SentDocumentsList documents={[doc()]} onChanged={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(deleteDocument).not.toHaveBeenCalled();
  });

  it("muestra el mensaje de un ApiError si falla el borrado de un documento", async () => {
    const user = userEvent.setup();
    deleteDocument.mockRejectedValue(new ApiError("No autorizado para eliminar", 403));
    render(<SentDocumentsList documents={[doc()]} onChanged={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("No autorizado para eliminar")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error al borrar un documento no es un ApiError", async () => {
    const user = userEvent.setup();
    deleteDocument.mockRejectedValue(new Error("boom"));
    render(<SentDocumentsList documents={[doc()]} onChanged={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("No se pudo eliminar")).toBeInTheDocument();
  });

  it("muestra el mensaje de un ApiError si falla la descarga de un documento", async () => {
    const user = userEvent.setup();
    downloadDocument.mockRejectedValue(new ApiError("No autorizado para descargar", 403));
    render(<SentDocumentsList documents={[doc()]} onChanged={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Descargar" }));

    expect(await screen.findByText("No autorizado para descargar")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error al descargar un documento no es un ApiError", async () => {
    const user = userEvent.setup();
    downloadDocument.mockRejectedValue(new Error("boom"));
    render(<SentDocumentsList documents={[doc()]} onChanged={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Descargar" }));

    expect(await screen.findByText("No se pudo descargar")).toBeInTheDocument();
  });
});
