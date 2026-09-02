import type { ProjectDetailDTO, SupervisorWorkerOptionDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupervisorProjectDetail } from "../../src/pages/supervisor/SupervisorProjectDetail.js";

const fetchMyProject = vi.hoisted(() => vi.fn());
const updateMyProject = vi.hoisted(() => vi.fn());
const assignMemberToMyProject = vi.hoisted(() => vi.fn());
const removeMemberFromMyProject = vi.hoisted(() => vi.fn());
const fetchWorkersForAssignment = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/supervisorProjects.js", () => ({
  fetchMyProject,
  updateMyProject,
  assignMemberToMyProject,
  removeMemberFromMyProject,
  fetchWorkersForAssignment,
}));

function makeProject(overrides: Partial<ProjectDetailDTO> = {}): ProjectDetailDTO {
  return {
    id: "p1",
    name: "Proyecto Web",
    description: "Rediseño del portal",
    supervisorId: "s1",
    supervisorName: "Ana",
    isArchived: false,
    clientName: "Acme S.L.",
    clientContact: "contacto@acme.test",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    members: [],
    ...overrides,
  };
}

const workers: SupervisorWorkerOptionDTO[] = [{ id: "u1", fullName: "Juan Worker", currentProjectId: null }];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/supervisor/projects/p1"]}>
      <Routes>
        <Route path="/supervisor/projects/:id" element={<SupervisorProjectDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SupervisorProjectDetail", () => {
  beforeEach(() => {
    fetchMyProject.mockReset().mockResolvedValue(makeProject());
    fetchWorkersForAssignment.mockReset().mockResolvedValue(workers);
    updateMyProject.mockReset().mockResolvedValue(undefined);
    assignMemberToMyProject.mockReset().mockResolvedValue(undefined);
    removeMemberFromMyProject.mockReset().mockResolvedValue(undefined);
  });

  it("carga el proyecto y los trabajadores asignables al montar", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Proyecto Web" })).toBeInTheDocument();
    expect(fetchMyProject).toHaveBeenCalledWith("p1");
    expect(fetchWorkersForAssignment).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("option", { name: "Juan Worker" })).toBeInTheDocument();
  });

  it("guarda los cambios de nombre/descripción sin tocar supervisor ni archivado", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Proyecto Web" });

    const nameInput = screen.getByLabelText("Nombre");
    await user.clear(nameInput);
    await user.type(nameInput, "Proyecto Web v2");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(updateMyProject).toHaveBeenCalledWith("p1", { name: "Proyecto Web v2", description: "Rediseño del portal" }),
    );
  });

  it("no ofrece campos de supervisor ni de archivado (exclusivos del admin)", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Proyecto Web" });
    expect(screen.queryByLabelText("Supervisor/a")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Archivado")).not.toBeInTheDocument();
  });

  it("confirma visualmente que se ha guardado", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Proyecto Web" });

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
  });

  it("muestra los datos del cliente en solo lectura, sin ningún campo para editarlos", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Proyecto Web" });

    expect(screen.getByText("Cliente: Acme S.L. · Contacto: contacto@acme.test")).toBeInTheDocument();
    expect(screen.queryByLabelText("Cliente")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Contacto/)).not.toBeInTheDocument();
  });
});
