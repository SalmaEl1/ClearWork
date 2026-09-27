import type { TaskDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { WorkerTasks } from "../../src/pages/worker/WorkerTasks.js";

const fetchTasks = vi.hoisted(() => vi.fn());
const updateTaskStatus = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/tasks.js", () => ({ fetchTasks, updateTaskStatus }));

function task(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: "t1",
    projectId: "p1",
    assigneeId: "u1",
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

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkerTasks />
    </MemoryRouter>,
  );
}

describe("WorkerTasks — paginación", () => {
  beforeEach(() => {
    fetchTasks.mockReset().mockResolvedValue({ items: [task()], total: 1, page: 1, pageSize: 10 });
    updateTaskStatus.mockReset();
  });

  it("pide la primera página con 10 elementos por defecto", async () => {
    renderPage();
    await screen.findByText("Diseñar login");
    expect(fetchTasks).toHaveBeenCalledWith({ status: undefined, page: 1, pageSize: 10 });
  });

  it("cambiar el tamaño de página vuelve a la página 1 con el tamaño nuevo", async () => {
    fetchTasks.mockResolvedValue({
      items: Array.from({ length: 12 }, (_, i) => task({ id: `t${i}`, title: `Tarea ${i}` })),
      total: 25,
      page: 1,
      pageSize: 10,
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Tarea 0");

    await user.selectOptions(screen.getByLabelText("Elementos por página"), "50");

    await waitFor(() =>
      expect(fetchTasks).toHaveBeenLastCalledWith({ status: undefined, page: 1, pageSize: 50 }),
    );
  });

  it("avanzar de página pide la página siguiente", async () => {
    fetchTasks.mockResolvedValue({ items: [task()], total: 25, page: 1, pageSize: 10 });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Siguiente →" }));

    await waitFor(() =>
      expect(fetchTasks).toHaveBeenLastCalledWith({ status: undefined, page: 2, pageSize: 10 }),
    );
  });
});

describe("WorkerTasks — tablero", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchTasks.mockReset().mockResolvedValue({ items: [task()], total: 1, page: 1, pageSize: 10 });
    updateTaskStatus.mockReset();
  });

  it("cambiar a 'Tablero' pide todas las tareas, sin paginar ni filtrar por estado", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Tablero" }));

    await waitFor(() =>
      expect(fetchTasks).toHaveBeenLastCalledWith({ page: 1, pageSize: 500 }),
    );
  });

  it("en modo tablero se ven las columnas por estado, no la tabla", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Tablero" }));

    expect(await screen.findByText("pendiente (1)")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("volver a 'Lista' pide de nuevo la primera página con el tamaño por defecto", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    await user.click(screen.getByRole("button", { name: "Tablero" }));
    await screen.findByText("pendiente (1)");
    await user.click(screen.getByRole("button", { name: "Lista" }));

    await waitFor(() =>
      expect(fetchTasks).toHaveBeenLastCalledWith({ status: undefined, page: 1, pageSize: 10 }),
    );
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
});

describe("WorkerTasks — filtros y errores de carga", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchTasks.mockReset().mockResolvedValue({ items: [task()], total: 1, page: 1, pageSize: 10 });
    updateTaskStatus.mockReset();
  });

  it("filtra las tareas por estado usando el selector de la lista", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    const filterSelect = screen.getAllByRole("combobox")[0];
    await user.selectOptions(filterSelect, "in_progress");

    await waitFor(() =>
      expect(fetchTasks).toHaveBeenLastCalledWith({ status: "in_progress", page: 1, pageSize: 10 }),
    );
  });

  it("muestra un mensaje distinto según haya o no un filtro activo sin tareas", async () => {
    const user = userEvent.setup();
    fetchTasks.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });
    renderPage();

    expect(await screen.findByText("No tienes tareas asignadas.")).toBeInTheDocument();

    const filterSelect = screen.getAllByRole("combobox")[0];
    await user.selectOptions(filterSelect, "pending");

    expect(await screen.findByText("No tienes tareas en ese estado.")).toBeInTheDocument();
  });

  it("muestra tareas con descripción junto al título", async () => {
    fetchTasks.mockResolvedValue({
      items: [task({ description: "Usar el nuevo diseño del sistema" })],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    renderPage();

    expect(await screen.findByText("Usar el nuevo diseño del sistema")).toBeInTheDocument();
  });

  it("muestra el mensaje de un ApiError cuando falla la carga de tareas", async () => {
    fetchTasks.mockRejectedValue(new ApiError("No se pudo conectar con el servidor", 500));

    renderPage();

    expect(await screen.findByText("No se pudo conectar con el servidor")).toBeInTheDocument();
  });

  it("usa un mensaje genérico cuando el error de carga no es un ApiError", async () => {
    fetchTasks.mockRejectedValue(new Error("boom"));

    renderPage();

    expect(await screen.findByText("No se pudieron cargar las tareas")).toBeInTheDocument();
  });
});

describe("WorkerTasks — cambio de estado desde la lista", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchTasks.mockReset().mockResolvedValue({ items: [task()], total: 1, page: 1, pageSize: 10 });
    updateTaskStatus.mockReset().mockResolvedValue(undefined);
  });

  it("cambiar el estado de una tarea desde la lista la actualiza y recarga", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Diseñar login");

    const rowSelect = screen.getAllByRole("combobox")[1];
    await user.selectOptions(rowSelect, "in_progress");

    await waitFor(() => expect(updateTaskStatus).toHaveBeenCalledWith("t1", "in_progress"));
    await waitFor(() => expect(fetchTasks.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("muestra el mensaje de un ApiError si falla el cambio de estado de una tarea", async () => {
    const user = userEvent.setup();
    updateTaskStatus.mockRejectedValue(new ApiError("No autorizado para cambiar el estado", 403));
    renderPage();
    await screen.findByText("Diseñar login");

    const rowSelect = screen.getAllByRole("combobox")[1];
    await user.selectOptions(rowSelect, "in_progress");

    expect(await screen.findByText("No autorizado para cambiar el estado")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error al cambiar el estado no es un ApiError", async () => {
    const user = userEvent.setup();
    updateTaskStatus.mockRejectedValue(new Error("boom"));
    renderPage();
    await screen.findByText("Diseñar login");

    const rowSelect = screen.getAllByRole("combobox")[1];
    await user.selectOptions(rowSelect, "in_progress");

    expect(await screen.findByText("No se pudo cambiar el estado")).toBeInTheDocument();
  });
});
