import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDocuments } from "../../src/pages/admin/AdminDocuments.js";

const fetchSentDocuments = vi.hoisted(() => vi.fn());
const fetchAllAdminUsers = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/documents.js", () => ({
  fetchSentDocuments,
  createDocument: vi.fn(),
  deleteDocument: vi.fn(),
  downloadDocument: vi.fn(),
}));
vi.mock("../../src/api/admin.js", () => ({ fetchAllAdminUsers }));

describe("AdminDocuments", () => {
  beforeEach(() => {
    fetchSentDocuments.mockReset().mockResolvedValue([]);
    fetchAllAdminUsers.mockReset().mockResolvedValue([
      { id: "u1", fullName: "Juan Worker", role: "worker" },
      { id: "u2", fullName: "Ana Supervisor", role: "supervisor" },
    ]);
  });

  it("carga los documentos enviados y solo ofrece trabajadores como destinatarios", async () => {
    render(<AdminDocuments />);

    expect(await screen.findByText("Todavía no has compartido ningún documento.")).toBeInTheDocument();
    await waitFor(() => expect(fetchAllAdminUsers).toHaveBeenCalled());
    expect(await screen.findByLabelText("Juan Worker")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ana Supervisor")).not.toBeInTheDocument();
  });

  it("muestra un aviso si falla la carga de documentos", async () => {
    fetchSentDocuments.mockRejectedValue(new Error("boom"));
    render(<AdminDocuments />);
    expect(await screen.findByText("No se pudieron cargar los documentos")).toBeInTheDocument();
  });
});
