import type { AdminUserSummary, ProjectDetailDTO, TaskDTO } from "@clearwork/shared";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { AdminProjectDetail } from "../../src/pages/admin/AdminProjectDetail.js";

const fetchAdminProject = vi.hoisted(() => vi.fn());
const fetchAllAdminUsers = vi.hoisted(() => vi.fn());
const fetchAdminProjectTasks = vi.hoisted(() => vi.fn());
const updateAdminProject = vi.hoisted(() => vi.fn());
const assignProjectMember = vi.hoisted(() => vi.fn());
const removeProjectMember = vi.hoisted(() => vi.fn());
const deleteAdminProject = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/admin.js", () => ({
  fetchAdminProject,
  fetchAllAdminUsers,
  fetchAdminProjectTasks,
  updateAdminProject,
  assignProjectMember,
  removeProjectMember,
  deleteAdminProject,
}));

function makeProject(overrides: Partial<ProjectDetailDTO> = {}): ProjectDetailDTO {
  return {
    id: "p1",
    name: "Proyecto Web",
    description: "Rediseño del portal",
    supervisorId: "s1",
    supervisorName: "Ana Supervisor",
    isArchived: false,
    clientName: "Acme S.L.",
    clientContact: "contacto@acme.test",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    members: [{ userId: "u1", fullName: "Juan Worker", joinedAt: "2026-01-01T00:00:00.000Z" }],
    ...overrides,
  };
}

const supervisor: AdminUserSummary = {
  id: "s1",
  email: "ana@clearwork.test",
  fullName: "Ana Supervisor",
  role: "supervisor",
  isActive: true,
  weeklyTargetHours: 40,
  hireDate: "2020-01-01",
  contractType: "full_time",
  currentProjectId: null,
  currentProjectName: null,
  supervisedProjects: [],
};

const memberWorker: AdminUserSummary = {
  id: "u1",
  email: "juan@clearwork.test",
  fullName: "Juan Worker",
  role: "worker",
  isActive: true,
  weeklyTargetHours: 40,
  hireDate: "2020-01-01",
  contractType: "full_time",
  currentProjectId: "p1",
  currentProjectName: "Proyecto Web",
  supervisedProjects: [],
};

const availableWorker: AdminUserSummary = {
  id: "u2",
  email: "maria@clearwork.test",
  fullName: "María Worker",
  role: "worker",
  isActive: true,
  weeklyTargetHours: 40,
  hireDate: "2020-01-01",
  contractType: "full_time",
  currentProjectId: null,
  currentProjectName: null,
  supervisedProjects: [],
};

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: "t1",
    projectId: "p1",
    assigneeId: "u1",
    createdBy: "s1",
    title: "Maquetar la home",
    description: null,
    status: "pending",
    progressPercentage: 0,
    dueDate: null,
    completedAt: null,
    estimatedHours: null,
    loggedMinutes: 0,
    remainingHours: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage(id = "p1") {
  return render(
    <MemoryRouter initialEntries={[`/admin/projects/${id}`]}>
      <Routes>
        <Route path="/admin/projects/:id" element={<AdminProjectDetail />} />
        <Route path="/admin/projects" element={<p>Lista de proyectos</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminProjectDetail", () => {
  beforeEach(() => {
    fetchAdminProject.mockReset().mockResolvedValue(makeProject());
    fetchAllAdminUsers.mockReset().mockResolvedValue([supervisor, memberWorker, availableWorker]);
    fetchAdminProjectTasks.mockReset().mockResolvedValue([makeTask()]);
    updateAdminProject.mockReset().mockResolvedValue(makeProject());
    assignProjectMember.mockReset().mockResolvedValue(makeProject());
    removeProjectMember.mockReset().mockResolvedValue(makeProject());
    deleteAdminProject.mockReset().mockResolvedValue(undefined);
  });

  it("carga el proyecto, sus usuarios y sus tareas a partir del id de la ruta", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Proyecto Web" })).toBeInTheDocument();
    expect(fetchAdminProject).toHaveBeenCalledWith("p1");
    expect(fetchAllAdminUsers).toHaveBeenCalledTimes(1);
    expect(fetchAdminProjectTasks).toHaveBeenCalledWith("p1");
  });

  it("muestra las tareas en solo lectura, con quién las tiene asignadas y su estado", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Proyecto Web" });

    expect(await screen.findByText("Maquetar la home")).toBeInTheDocument();
    const tasksCard = screen.getByRole("heading", { name: "Tareas (1)" }).closest(".card") as HTMLElement;
    expect(within(tasksCard).getByText("Juan Worker")).toBeInTheDocument();
    expect(within(tasksCard).getByText("pendiente")).toBeInTheDocument();
    expect(screen.getByText("1 pendiente(s) · 0 en curso · 0 hecha(s)")).toBeInTheDocument();
    // No hay ninguna vía para crear, editar o borrar tareas desde aquí.
    expect(screen.queryByRole("button", { name: /crear tarea/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /editar tarea/i })).not.toBeInTheDocument();
  });

  it("muestra el estado vacío cuando el proyecto no tiene tareas", async () => {
    fetchAdminProjectTasks.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Todavía no hay tareas en este proyecto.")).toBeInTheDocument();
  });

  it("edita los datos del proyecto y confirma visualmente el guardado", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Proyecto Web" });

    const nameInput = screen.getByLabelText("Nombre");
    await user.clear(nameInput);
    await user.type(nameInput, "Proyecto Web v2");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(updateAdminProject).toHaveBeenCalledWith("p1", {
        name: "Proyecto Web v2",
        description: "Rediseño del portal",
        supervisorId: "s1",
        isArchived: false,
        clientName: "Acme S.L.",
        clientContact: "contacto@acme.test",
      }),
    );
    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
  });

  it("asigna un/a trabajador/a disponible al proyecto", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Proyecto Web" });

    const membersCard = screen.getByRole("heading", { name: "Miembros (1)" }).closest(".card") as HTMLElement;
    await user.selectOptions(within(membersCard).getByRole("combobox"), "María Worker");
    await user.click(within(membersCard).getByRole("button", { name: "Asignar" }));

    await waitFor(() => expect(assignProjectMember).toHaveBeenCalledWith("p1", { userId: "u2" }));
  });

  it("quita a un miembro del proyecto", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Proyecto Web" });

    await user.click(screen.getByRole("button", { name: "Quitar del proyecto" }));

    await waitFor(() => expect(removeProjectMember).toHaveBeenCalledWith("p1", "u1"));
  });

  it("elimina el proyecto tras confirmar y vuelve al listado", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Proyecto Web" });

    await user.click(screen.getByRole("button", { name: "Eliminar proyecto" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(deleteAdminProject).toHaveBeenCalledWith("p1"));
    expect(await screen.findByText("Lista de proyectos")).toBeInTheDocument();
  });

  it("muestra un aviso si falla la carga del proyecto", async () => {
    fetchAdminProject.mockRejectedValue(new ApiError("No se pudo cargar el proyecto", 500));
    renderPage();
    expect(await screen.findByText("No se pudo cargar el proyecto")).toBeInTheDocument();
  });
});
