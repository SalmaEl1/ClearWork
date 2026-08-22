import type { ProjectDTO, ProjectMemberDTO, TaskDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupervisorTasks } from "../../src/pages/supervisor/SupervisorTasks.js";

const createTask = vi.hoisted(() => vi.fn());
const deleteTask = vi.hoisted(() => vi.fn());
const fetchMyProjectMembers = vi.hoisted(() => vi.fn());
const fetchMyProjects = vi.hoisted(() => vi.fn());
const fetchTasks = vi.hoisted(() => vi.fn());
const updateTask = vi.hoisted(() => vi.fn());
const updateTaskStatus = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/tasks.js", () => ({
  createTask,
  deleteTask,
  fetchMyProjectMembers,
  fetchMyProjects,
  fetchTasks,
  updateTask,
  updateTaskStatus,
}));

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

const members: ProjectMemberDTO[] = [{ userId: "u1", fullName: "Juan Worker", joinedAt: "2026-01-01T00:00:00.000Z" }];

function task(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: "t1",
    projectId: "p1",
    assigneeId: null,
    createdBy: "s1",
    title: "Diseñar login",
    description: null,
    status: "pending",
    progressPercentage: 0,
    dueDate: null,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SupervisorTasks />
    </MemoryRouter>,
  );
}

describe("SupervisorTasks — filtros de estado", () => {
  beforeEach(() => {
    fetchMyProjects.mockReset().mockResolvedValue([project()]);
    fetchMyProjectMembers.mockReset().mockResolvedValue(members);
    fetchTasks.mockReset().mockResolvedValue([task()]);
  });

  it("carga todas las tareas del proyecto por defecto, sin filtro de estado", async () => {
    renderPage();
    await screen.findByText("Diseñar login");
    expect(fetchTasks).toHaveBeenCalledWith({ projectId: "p1" });
  });

  it("muestra un botón por cada estado más 'Todas'", async () => {
    renderPage();
    await screen.findByText("Diseñar login");
    for (const label of ["Todas", "Pendiente", "En curso", "Completada"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("al pulsar un estado, vuelve a pedir las tareas filtradas por ese estado", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "En curso" }));

    await waitFor(() =>
      expect(fetchTasks).toHaveBeenLastCalledWith({ projectId: "p1", status: "in_progress" }),
    );
  });

  it("al volver a 'Todas' quita el filtro de estado de la petición", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Completada" }));
    await waitFor(() => expect(fetchTasks).toHaveBeenLastCalledWith({ projectId: "p1", status: "done" }));

    await user.click(screen.getByRole("button", { name: "Todas" }));
    await waitFor(() => expect(fetchTasks).toHaveBeenLastCalledWith({ projectId: "p1" }));
  });

  it("muestra un mensaje distinto cuando el filtro no tiene tareas", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    fetchTasks.mockResolvedValue([]);
    await user.click(screen.getByRole("button", { name: "Pendiente" }));

    expect(await screen.findByText("No hay tareas en ese estado.")).toBeInTheDocument();
  });

  it("marca como estado activo el botón del filtro seleccionado", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    const allButton = screen.getByRole("button", { name: "Todas" });
    const pendingButton = screen.getByRole("button", { name: "Pendiente" });
    expect(allButton).not.toHaveClass("secondary");
    expect(pendingButton).toHaveClass("secondary");

    await user.click(pendingButton);

    expect(pendingButton).not.toHaveClass("secondary");
    expect(allButton).toHaveClass("secondary");
  });
});
