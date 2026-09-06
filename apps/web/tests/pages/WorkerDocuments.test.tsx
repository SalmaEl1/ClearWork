import type { DocumentDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkerDocuments } from "../../src/pages/worker/WorkerDocuments.js";

const fetchMyDocuments = vi.hoisted(() => vi.fn());
const downloadDocument = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/documents.js", () => ({ fetchMyDocuments, downloadDocument }));

function doc(overrides: Partial<DocumentDTO> = {}): DocumentDTO {
  return {
    id: "d1",
    label: "Nómina de mayo",
    originalName: "nomina.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2048,
    uploaderName: "Ana Admin",
    createdAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("WorkerDocuments", () => {
  beforeEach(() => {
    fetchMyDocuments.mockReset().mockResolvedValue([doc()]);
    downloadDocument.mockReset().mockResolvedValue(undefined);
  });

  it("muestra el estado vacío cuando no hay documentos", async () => {
    fetchMyDocuments.mockResolvedValue([]);
    render(<WorkerDocuments />);
    expect(await screen.findByText("Todavía no tienes ningún documento compartido.")).toBeInTheDocument();
  });

  it("lista los documentos compartidos, con quién lo compartió", async () => {
    render(<WorkerDocuments />);
    expect(await screen.findByText("Nómina de mayo")).toBeInTheDocument();
    expect(screen.getByText(/compartido por Ana Admin/)).toBeInTheDocument();
  });

  it("descarga un documento al pinchar en Descargar", async () => {
    const user = userEvent.setup();
    render(<WorkerDocuments />);
    await user.click(await screen.findByRole("button", { name: "Descargar" }));

    await waitFor(() => expect(downloadDocument).toHaveBeenCalledWith("d1", "nomina.pdf"));
  });
});
