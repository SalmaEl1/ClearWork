import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupervisorDocuments } from "../../src/pages/supervisor/SupervisorDocuments.js";

const fetchSentDocuments = vi.hoisted(() => vi.fn());
const fetchSupervisorDashboard = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/documents.js", () => ({
  fetchSentDocuments,
  createDocument: vi.fn(),
  deleteDocument: vi.fn(),
  downloadDocument: vi.fn(),
}));
vi.mock("../../src/api/dashboard.js", () => ({ fetchSupervisorDashboard }));

describe("SupervisorDocuments", () => {
  beforeEach(() => {
    fetchSentDocuments.mockReset().mockResolvedValue([]);
    fetchSupervisorDashboard.mockReset().mockResolvedValue({
      team: [
        { id: "u1", fullName: "Juan Worker" },
        { id: "u2", fullName: "Marta Worker" },
      ],
    });
  });

  it("ofrece a todo el equipo del supervisor como posibles destinatarios", async () => {
    render(<SupervisorDocuments />);

    await waitFor(() => expect(fetchSupervisorDashboard).toHaveBeenCalled());
    expect(await screen.findByLabelText("Juan Worker")).toBeInTheDocument();
    expect(screen.getByLabelText("Marta Worker")).toBeInTheDocument();
  });

  it("avisa si no se puede cargar el equipo", async () => {
    fetchSupervisorDashboard.mockRejectedValue(new Error("boom"));
    render(<SupervisorDocuments />);
    expect(await screen.findByText("No se pudo cargar el equipo")).toBeInTheDocument();
  });
});
