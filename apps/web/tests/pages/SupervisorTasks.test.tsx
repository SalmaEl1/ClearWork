import type { ProjectDTO, ProjectMemberDTO, TaskDTO } from "@clearwork/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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
    estimatedHours: null,
    loggedMinutes: 0,
    remainingHours: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function taskPage(items: TaskDTO[]) {
  return { items, total: items.length, page: 1, pageSize: 10 };
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
    fetchTasks.mockReset().mockResolvedValue(taskPage([task()]));
  });

  it("carga todas las tareas del proyecto por defecto, sin filtro de estado", async () => {
    renderPage();
    await screen.findByText("Diseñar login");
    expect(fetchTasks).toHaveBeenCalledWith({ projectId: "p1", status: undefined, page: 1, pageSize: 10 });
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
      expect(fetchTasks).toHaveBeenLastCalledWith({
        projectId: "p1",
        status: "in_progress",
        page: 1,
        pageSize: 10,
      }),
    );
  });

  it("al volver a 'Todas' quita el filtro de estado de la petición", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Completada" }));
    await waitFor(() =>
      expect(fetchTasks).toHaveBeenLastCalledWith({ projectId: "p1", status: "done", page: 1, pageSize: 10 }),
    );

    await user.click(screen.getByRole("button", { name: "Todas" }));
    await waitFor(() =>
      expect(fetchTasks).toHaveBeenLastCalledWith({
        projectId: "p1",
        status: undefined,
        page: 1,
        pageSize: 10,
      }),
    );
  });

  it("muestra un mensaje distinto cuando el filtro no tiene tareas", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    fetchTasks.mockResolvedValue(taskPage([]));
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

describe("SupervisorTasks — fecha límite hoy o posterior", () => {
  beforeEach(() => {
    fetchMyProjects.mockReset().mockResolvedValue([project()]);
    fetchMyProjectMembers.mockReset().mockResolvedValue(members);
    fetchTasks.mockReset().mockResolvedValue(taskPage([task()]));
    createTask.mockReset().mockResolvedValue(task());
    updateTask.mockReset().mockResolvedValue(task());
  });

  it("no crea la tarea si la fecha límite es anterior a hoy", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "+ Nueva tarea" }));
    await user.type(screen.getByLabelText("Título"), "Nueva");
    fireEvent.change(screen.getByLabelText("Fecha límite (opcional)"), { target: { value: isoOffset(-1) } });
    await user.click(screen.getByRole("button", { name: "Crear tarea" }));

    await waitFor(() => expect(createTask).not.toHaveBeenCalled());
  });

  it("crea la tarea si la fecha límite es hoy", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "+ Nueva tarea" }));
    await user.type(screen.getByLabelText("Título"), "Nueva");
    fireEvent.change(screen.getByLabelText("Fecha límite (opcional)"), { target: { value: isoOffset(0) } });
    await user.click(screen.getByRole("button", { name: "Crear tarea" }));

    await waitFor(() => expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ dueDate: isoOffset(0) })));
  });

  it("permite editar otros campos de una tarea ya vencida sin tocar su fecha límite", async () => {
    const user = userEvent.setup();
    fetchTasks.mockResolvedValue(taskPage([task({ dueDate: isoOffset(-5) })]));
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const titleInput = screen.getByLabelText("Título");
    await user.clear(titleInput);
    await user.type(titleInput, "Renombrada");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateTask).toHaveBeenCalled());
    const [, body] = updateTask.mock.calls[0];
    expect(body).not.toHaveProperty("dueDate");
  });

  it("no permite mover la fecha límite de una tarea vencida a otra fecha pasada", async () => {
    const user = userEvent.setup();
    fetchTasks.mockResolvedValue(taskPage([task({ dueDate: isoOffset(-5) })]));
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Fecha límite (opcional)"), { target: { value: isoOffset(-2) } });
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("La fecha límite no puede ser anterior a hoy")).toBeInTheDocument();
    expect(updateTask).not.toHaveBeenCalled();
  });
});

describe("SupervisorTasks — tablero", () => {
  beforeEach(() => {
    fetchMyProjects.mockReset().mockResolvedValue([project()]);
    fetchMyProjectMembers.mockReset().mockResolvedValue(members);
    fetchTasks.mockReset().mockResolvedValue(taskPage([task({ assigneeId: "u1" })]));
  });

  it("cambiar a 'Tablero' pide todas las tareas del proyecto, sin paginar ni filtrar", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Tablero" }));

    await waitFor(() =>
      expect(fetchTasks).toHaveBeenLastCalledWith({ projectId: "p1", page: 1, pageSize: 500 }),
    );
  });

  it("en modo tablero se ven las columnas por estado, con el responsable de cada tarjeta", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Tablero" }));

    expect(await screen.findByText("pendiente (1)")).toBeInTheDocument();
    expect(screen.getByText("Juan Worker")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("en modo tablero no se ven los botones de filtro por estado ni la paginación", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Tablero" }));
    await screen.findByText("pendiente (1)");

    expect(screen.queryByRole("button", { name: "Pendiente" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Elementos por página")).not.toBeInTheDocument();
  });
});
