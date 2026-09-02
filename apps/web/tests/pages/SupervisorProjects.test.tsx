import type { ProjectDTO } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupervisorProjects } from "../../src/pages/supervisor/SupervisorProjects.js";

const fetchMyProjects = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/tasks.js", () => ({ fetchMyProjects }));

function project(overrides: Partial<ProjectDTO> = {}): ProjectDTO {
  return {
    id: "p1",
    name: "Proyecto Web",
    description: null,
    supervisorId: "s1",
    isArchived: false,
    clientName: "Acme S.L.",
    clientContact: "contacto@acme.test",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/supervisor/projects"]}>
      <Routes>
        <Route path="/supervisor/projects" element={<SupervisorProjects />} />
        <Route path="/supervisor/projects/:id" element={<div>Detalle del proyecto</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SupervisorProjects", () => {
  beforeEach(() => {
    fetchMyProjects.mockReset();
  });

  it("muestra el estado vacío cuando el supervisor no tiene ningún proyecto a cargo", async () => {
    fetchMyProjects.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Todavía no tienes ningún proyecto a cargo.")).toBeInTheDocument();
  });

  it("redirige directamente a la gestión de su proyecto cuando tiene uno", async () => {
    fetchMyProjects.mockResolvedValue([project()]);
    renderPage();
    expect(await screen.findByText("Detalle del proyecto")).toBeInTheDocument();
  });

  it("muestra el error de la API si falla la carga", async () => {
    fetchMyProjects.mockRejectedValue(new Error("network down"));
    renderPage();
    expect(await screen.findByText("No se pudo cargar tu proyecto")).toBeInTheDocument();
  });
});
