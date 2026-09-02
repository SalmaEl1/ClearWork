import type { ProjectDetailDTO } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { WorkerProject } from "../../src/pages/worker/WorkerProject.js";

const fetchMyProjectAsWorker = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/workerProject.js", () => ({ fetchMyProjectAsWorker }));

function makeProject(overrides: Partial<ProjectDetailDTO> = {}): ProjectDetailDTO {
  return {
    id: "p1",
    name: "Proyecto Web",
    description: "Rediseño del portal",
    supervisorId: "s1",
    supervisorName: "Ana Supervisora",
    isArchived: false,
    clientName: "Acme S.L.",
    clientContact: "contacto@acme.test",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    members: [{ userId: "u1", fullName: "Juan Worker", joinedAt: "2026-01-01T00:00:00.000Z" }],
    ...overrides,
  };
}

describe("WorkerProject", () => {
  it("muestra el nombre, la descripción y el supervisor del proyecto", async () => {
    fetchMyProjectAsWorker.mockResolvedValue(makeProject());
    render(<WorkerProject />);

    expect(await screen.findByRole("heading", { name: "Proyecto Web" })).toBeInTheDocument();
    expect(screen.getByText("Rediseño del portal")).toBeInTheDocument();
    expect(screen.getByText("Supervisor/a: Ana Supervisora")).toBeInTheDocument();
  });

  it("muestra los datos del cliente", async () => {
    fetchMyProjectAsWorker.mockResolvedValue(makeProject());
    render(<WorkerProject />);

    expect(
      await screen.findByText("Cliente: Acme S.L. · Contacto: contacto@acme.test"),
    ).toBeInTheDocument();
  });

  it("lista al resto del equipo", async () => {
    fetchMyProjectAsWorker.mockResolvedValue(
      makeProject({
        members: [
          { userId: "u1", fullName: "Juan Worker", joinedAt: "2026-01-01T00:00:00.000Z" },
          { userId: "u2", fullName: "Marta Worker", joinedAt: "2026-01-02T00:00:00.000Z" },
        ],
      }),
    );
    render(<WorkerProject />);

    expect(await screen.findByText("Juan Worker")).toBeInTheDocument();
    expect(screen.getByText("Marta Worker")).toBeInTheDocument();
  });

  it("muestra un mensaje cuando no hay nadie más en el equipo", async () => {
    fetchMyProjectAsWorker.mockResolvedValue(makeProject({ members: [] }));
    render(<WorkerProject />);

    expect(await screen.findByText("Todavía no hay nadie más en el equipo.")).toBeInTheDocument();
  });

  it("muestra un error si no tiene ningún proyecto asignado", async () => {
    fetchMyProjectAsWorker.mockRejectedValue(new ApiError("No tienes ningún proyecto asignado", 404));
    render(<WorkerProject />);

    expect(await screen.findByText("No tienes ningún proyecto asignado")).toBeInTheDocument();
  });
});
