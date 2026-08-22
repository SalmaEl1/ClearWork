import type { ProjectDTO } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SupervisorProjects />
    </MemoryRouter>,
  );
}

describe("SupervisorProjects", () => {
  beforeEach(() => {
    fetchMyProjects.mockReset();
  });

  it("muestra el estado vacío cuando el supervisor no tiene proyectos a cargo", async () => {
    fetchMyProjects.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Todavía no tienes proyectos a cargo.")).toBeInTheDocument();
  });

  it("lista los proyectos y marca los archivados", async () => {
    fetchMyProjects.mockResolvedValue([project({ name: "Activo" }), project({ id: "p2", name: "Viejo", isArchived: true })]);
    renderPage();

    expect(await screen.findByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("Viejo")).toBeInTheDocument();
    expect(screen.getByText("Archivado")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Gestionar" })).toHaveLength(2);
  });

  it("muestra el error de la API si falla la carga", async () => {
    fetchMyProjects.mockRejectedValue(new Error("network down"));
    renderPage();
    expect(await screen.findByText("No se pudo cargar la lista")).toBeInTheDocument();
  });
});
