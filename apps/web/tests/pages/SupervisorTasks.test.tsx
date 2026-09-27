import type { ProjectDTO, ProjectMemberDTO, TaskDTO } from "@clearwork/shared";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
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
    clientName: "Acme S.L.",
    clientContact: "contacto@acme.test",
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
    localStorage.clear();
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

  it("recuerda el tablero como vista elegida la próxima vez que se entra", async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Tablero" }));
    await screen.findByText("pendiente (1)");
    unmount();

    renderPage();
    expect(await screen.findByText("pendiente (1)")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("vuelve al modo lista tras cambiar a tablero", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Tablero" }));
    await screen.findByText("pendiente (1)");

    await user.click(screen.getByRole("button", { name: "Lista" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pendiente" })).toBeInTheDocument();
  });
});

describe("SupervisorTasks — carga y errores de proyectos y tareas", () => {
  beforeEach(() => {
    fetchMyProjects.mockReset();
    fetchMyProjectMembers.mockReset().mockResolvedValue(members);
    fetchTasks.mockReset().mockResolvedValue(taskPage([task()]));
  });

  it("muestra 'Cargando…' mientras se obtienen los proyectos supervisados", async () => {
    let resolveProjects!: (value: ProjectDTO[]) => void;
    fetchMyProjects.mockImplementation(
      () =>
        new Promise<ProjectDTO[]>((resolve) => {
          resolveProjects = resolve;
        }),
    );

    renderPage();

    expect(await screen.findByText("Cargando…")).toBeInTheDocument();
    resolveProjects([project()]);

    expect(await screen.findByText("Diseñar login")).toBeInTheDocument();
    expect(screen.queryByText("Cargando…")).not.toBeInTheDocument();
  });

  it("muestra un mensaje cuando el supervisor no tiene proyectos asignados", async () => {
    fetchMyProjects.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("Todavía no supervisas ningún proyecto.")).toBeInTheDocument();
    expect(fetchTasks).not.toHaveBeenCalled();
  });

  it("muestra el mensaje de un ApiError cuando fallan los proyectos supervisados", async () => {
    fetchMyProjects.mockRejectedValue(new ApiError("Error al cargar proyectos", 500));

    renderPage();

    expect(await screen.findByText("Error al cargar proyectos")).toBeInTheDocument();
  });

  it("usa un mensaje genérico cuando el error de proyectos no es un ApiError", async () => {
    fetchMyProjects.mockRejectedValue(new Error("boom"));

    renderPage();

    expect(await screen.findByText("No se pudieron cargar los proyectos")).toBeInTheDocument();
  });

  it("muestra el mensaje de un ApiError cuando fallan las tareas o los miembros del proyecto", async () => {
    fetchMyProjects.mockResolvedValue([project()]);
    fetchTasks.mockRejectedValue(new ApiError("Error al cargar tareas", 500));

    renderPage();

    expect(await screen.findByText("Error al cargar tareas")).toBeInTheDocument();
  });

  it("usa un mensaje genérico cuando el error de tareas no es un ApiError", async () => {
    fetchMyProjects.mockResolvedValue([project()]);
    fetchTasks.mockRejectedValue(new Error("boom"));

    renderPage();

    expect(await screen.findByText("No se pudieron cargar las tareas")).toBeInTheDocument();
  });

  it("permite cambiar de proyecto seleccionado y marca los archivados en la lista", async () => {
    const user = userEvent.setup();
    fetchMyProjects.mockResolvedValue([
      project(),
      project({ id: "p2", name: "Proyecto App", isArchived: true }),
    ]);

    renderPage();
    await screen.findByText("Diseñar login");

    expect(screen.getByRole("option", { name: "Proyecto App (archivado)" })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Proyecto"), "p2");

    await waitFor(() =>
      expect(fetchTasks).toHaveBeenLastCalledWith({ projectId: "p2", status: undefined, page: 1, pageSize: 10 }),
    );
  });
});

describe("SupervisorTasks — paginación y cambio de estado", () => {
  beforeEach(() => {
    fetchMyProjects.mockReset().mockResolvedValue([project()]);
    fetchMyProjectMembers.mockReset().mockResolvedValue(members);
    fetchTasks.mockReset().mockResolvedValue(taskPage([task()]));
    updateTaskStatus.mockReset().mockResolvedValue(undefined);
  });

  it("cambiar los elementos por página resetea a la página 1 y vuelve a pedir tareas", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.selectOptions(screen.getByLabelText("Elementos por página"), "25");

    await waitFor(() =>
      expect(fetchTasks).toHaveBeenLastCalledWith({ projectId: "p1", status: undefined, page: 1, pageSize: 25 }),
    );
  });

  it("cambiar el estado de una tarea desde la lista la actualiza y recarga la lista", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.selectOptions(screen.getByDisplayValue("pendiente"), "in_progress");

    await waitFor(() => expect(updateTaskStatus).toHaveBeenCalledWith("t1", "in_progress"));
    await waitFor(() => expect(fetchTasks.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("muestra el mensaje de un ApiError si falla el cambio de estado de una tarea", async () => {
    const user = userEvent.setup();
    updateTaskStatus.mockRejectedValue(new ApiError("No autorizado para cambiar el estado", 403));
    renderPage();
    await screen.findByText("Diseñar login");

    await user.selectOptions(screen.getByDisplayValue("pendiente"), "in_progress");

    expect(await screen.findByText("No autorizado para cambiar el estado")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error al cambiar el estado no es un ApiError", async () => {
    const user = userEvent.setup();
    updateTaskStatus.mockRejectedValue(new Error("boom"));
    renderPage();
    await screen.findByText("Diseñar login");

    await user.selectOptions(screen.getByDisplayValue("pendiente"), "in_progress");

    expect(await screen.findByText("No se pudo cambiar el estado")).toBeInTheDocument();
  });
});

describe("SupervisorTasks — borrado de tareas", () => {
  beforeEach(() => {
    fetchMyProjects.mockReset().mockResolvedValue([project()]);
    fetchMyProjectMembers.mockReset().mockResolvedValue(members);
    fetchTasks.mockReset().mockResolvedValue(taskPage([task()]));
    deleteTask.mockReset().mockResolvedValue(undefined);
  });

  it("abre y cancela el diálogo de confirmación para eliminar una tarea sin borrarla", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/¿Eliminar "Diseñar login"\?/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(deleteTask).not.toHaveBeenCalled();
  });

  it("elimina una tarea tras confirmar y recarga la lista", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(deleteTask).toHaveBeenCalledWith("t1"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(fetchTasks.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("muestra el mensaje de un ApiError si falla el borrado de una tarea", async () => {
    const user = userEvent.setup();
    deleteTask.mockRejectedValue(new ApiError("No se puede eliminar una tarea con horas registradas", 409));
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("No se puede eliminar una tarea con horas registradas")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error al eliminar una tarea no es un ApiError", async () => {
    const user = userEvent.setup();
    deleteTask.mockRejectedValue(new Error("boom"));
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("No se pudo eliminar")).toBeInTheDocument();
  });
});

describe("SupervisorTasks — formulario de tarea", () => {
  beforeEach(() => {
    fetchMyProjects.mockReset().mockResolvedValue([project()]);
    fetchMyProjectMembers.mockReset().mockResolvedValue(members);
    fetchTasks.mockReset().mockResolvedValue(taskPage([task()]));
    createTask.mockReset().mockResolvedValue(task());
    updateTask.mockReset().mockResolvedValue(task());
  });

  it("rellena descripción, responsable y horas estimadas al crear una tarea", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "+ Nueva tarea" }));
    await user.type(screen.getByLabelText("Título"), "Nueva");
    await user.type(screen.getByLabelText("Descripción (opcional)"), "Detalles de la tarea");
    await user.selectOptions(screen.getByLabelText("Responsable"), "u1");
    await user.type(screen.getByLabelText("Horas estimadas (opcional)"), "3.5");
    await user.click(screen.getByRole("button", { name: "Crear tarea" }));

    await waitFor(() =>
      expect(createTask).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Detalles de la tarea", assigneeId: "u1", estimatedHours: 3.5 }),
      ),
    );
  });

  it("muestra el mensaje de un ApiError si falla la creación de la tarea", async () => {
    const user = userEvent.setup();
    createTask.mockRejectedValue(new ApiError("El proyecto está archivado", 409));
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "+ Nueva tarea" }));
    await user.type(screen.getByLabelText("Título"), "Nueva");
    await user.click(screen.getByRole("button", { name: "Crear tarea" }));

    expect(await screen.findByText("El proyecto está archivado")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error de creación no es un ApiError", async () => {
    const user = userEvent.setup();
    createTask.mockRejectedValue(new Error("boom"));
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "+ Nueva tarea" }));
    await user.type(screen.getByLabelText("Título"), "Nueva");
    await user.click(screen.getByRole("button", { name: "Crear tarea" }));

    expect(await screen.findByText("No se pudo guardar")).toBeInTheDocument();
  });

  it("cierra el modal de nueva tarea al pulsar cerrar", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "+ Nueva tarea" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(createTask).not.toHaveBeenCalled();
  });

  it("cierra el modal de edición al pulsar cerrar", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("actualiza la fecha límite de una tarea al editarla a una fecha futura válida", async () => {
    const user = userEvent.setup();
    fetchTasks.mockResolvedValue(taskPage([task({ dueDate: isoOffset(-5) })]));
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Fecha límite (opcional)"), { target: { value: isoOffset(5) } });
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(updateTask).toHaveBeenCalledWith("t1", expect.objectContaining({ dueDate: isoOffset(5) })),
    );
  });
});
