import type { ProjectMemberDTO, TaskDetailDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { SupervisorTaskDetail } from "../../src/pages/supervisor/SupervisorTaskDetail.js";

const fetchTask = vi.hoisted(() => vi.fn());
const fetchMyProjectMembers = vi.hoisted(() => vi.fn());
const updateTaskStatus = vi.hoisted(() => vi.fn());
const updateTaskProgress = vi.hoisted(() => vi.fn());
const logTaskTime = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/tasks.js", () => ({
  fetchTask,
  fetchMyProjectMembers,
  updateTaskStatus,
  updateTaskProgress,
  logTaskTime,
}));

function task(overrides: Partial<TaskDetailDTO> = {}): TaskDetailDTO {
  return {
    id: "t1",
    projectId: "p1",
    assigneeId: "u1",
    createdBy: "s1",
    title: "Diseñar login",
    description: "Pantalla de acceso",
    status: "pending",
    progressPercentage: 20,
    dueDate: "2026-02-01",
    completedAt: null,
    estimatedHours: 8,
    loggedMinutes: 90,
    remainingHours: 6.5,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    history: [
      { kind: "created", changedBy: "s1", changedByName: "Ana Supervisor", changedAt: "2026-01-01T00:00:00.000Z" },
    ],
    timeEntries: [],
    ...overrides,
  };
}

const members: ProjectMemberDTO[] = [{ userId: "u1", fullName: "Juan Worker", joinedAt: "2026-01-01T00:00:00.000Z" }];

function renderPage(initialEntry = "/supervisor/tasks/t1") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/supervisor/tasks/:id" element={<SupervisorTaskDetail />} />
        <Route path="/supervisor/tasks" element={<SupervisorTaskDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SupervisorTaskDetail", () => {
  beforeEach(() => {
    fetchTask.mockReset().mockResolvedValue(task());
    fetchMyProjectMembers.mockReset().mockResolvedValue(members);
    updateTaskStatus.mockReset().mockResolvedValue(task({ status: "done" }));
    updateTaskProgress.mockReset().mockResolvedValue(task());
    logTaskTime.mockReset().mockResolvedValue(task());
  });

  it("carga la tarea y los miembros del proyecto a partir del id de la ruta", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Diseñar login" })).toBeInTheDocument();
    expect(fetchTask).toHaveBeenCalledWith("t1");
    expect(fetchMyProjectMembers).toHaveBeenCalledWith("p1");
    expect(screen.getByText("Pantalla de acceso")).toBeInTheDocument();
    expect(screen.getByLabelText("Estado")).toHaveValue("pending");
    expect(screen.getByText("Fecha límite: 2026-02-01")).toBeInTheDocument();
  });

  it("muestra el nombre del responsable cuando está entre los miembros del proyecto", async () => {
    renderPage();
    expect(await screen.findByText("Responsable: Juan Worker")).toBeInTheDocument();
  });

  it("muestra un guion si el responsable ya no está entre los miembros del proyecto", async () => {
    fetchTask.mockResolvedValue(task({ assigneeId: "u9" }));
    renderPage();
    expect(await screen.findByText("Responsable: —")).toBeInTheDocument();
  });

  it("muestra 'Sin asignar' cuando la tarea no tiene responsable", async () => {
    fetchTask.mockResolvedValue(task({ assigneeId: null }));
    renderPage();
    expect(await screen.findByText("Responsable: Sin asignar")).toBeInTheDocument();
  });

  it("muestra 'sin fecha límite' cuando la tarea no tiene una", async () => {
    fetchTask.mockResolvedValue(task({ dueDate: null }));
    renderPage();
    expect(await screen.findByText("Fecha límite: sin fecha límite")).toBeInTheDocument();
  });

  it("ofrece volver al listado de tareas del supervisor", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Diseñar login" });
    expect(screen.getByRole("link", { name: /Volver a tareas/ })).toHaveAttribute(
      "href",
      "/supervisor/tasks",
    );
  });

  it("muestra el historial de la tarea", async () => {
    renderPage();
    expect(await screen.findByText(/Ana Supervisor creó la tarea/)).toBeInTheDocument();
  });

  it("cambia el estado de la tarea y recarga los datos y los miembros", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Diseñar login" });

    await user.selectOptions(screen.getByLabelText("Estado"), "done");

    await waitFor(() => expect(updateTaskStatus).toHaveBeenCalledWith("t1", "done"));
    await waitFor(() => expect(fetchTask).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(fetchMyProjectMembers).toHaveBeenCalledTimes(2));
  });

  it("muestra un error si falla el cambio de estado", async () => {
    const user = userEvent.setup();
    updateTaskStatus.mockRejectedValue(new ApiError("Transición de estado no permitida", 400));
    renderPage();
    await screen.findByRole("heading", { name: "Diseñar login" });

    await user.selectOptions(screen.getByLabelText("Estado"), "done");

    expect(await screen.findByText("Transición de estado no permitida")).toBeInTheDocument();
  });

  it("muestra un mensaje genérico si el cambio de estado falla sin ser un ApiError", async () => {
    const user = userEvent.setup();
    updateTaskStatus.mockRejectedValue(new Error("network down"));
    renderPage();
    await screen.findByRole("heading", { name: "Diseñar login" });

    await user.selectOptions(screen.getByLabelText("Estado"), "done");

    expect(await screen.findByText("No se pudo cambiar el estado")).toBeInTheDocument();
  });

  it("muestra 'Cargando…' mientras no ha llegado la tarea", () => {
    fetchTask.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("muestra un error y deja de mostrar 'Cargando…' si falla la carga inicial", async () => {
    fetchTask.mockRejectedValue(new Error("network down"));
    renderPage();
    expect(await screen.findByText("No se pudo cargar la tarea")).toBeInTheDocument();
    expect(screen.queryByText("Cargando…")).not.toBeInTheDocument();
  });

  it("muestra la tarea igualmente si falla la carga de los miembros del proyecto, junto con el error", async () => {
    fetchMyProjectMembers.mockRejectedValue(new Error("network down"));
    renderPage();
    expect(await screen.findByRole("heading", { name: "Diseñar login" })).toBeInTheDocument();
    expect(await screen.findByText("No se pudo cargar la tarea")).toBeInTheDocument();
  });

  it("no renderiza nada si la ruta no lleva id de tarea", () => {
    const { container } = renderPage("/supervisor/tasks");
    expect(container).toBeEmptyDOMElement();
    expect(fetchTask).not.toHaveBeenCalled();
  });
});
