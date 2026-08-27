import type { ActiveSessionResponse, TaskDTO, WorkSessionDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClockWidget } from "../../src/components/ClockWidget.js";

const fetchActiveSession = vi.hoisted(() => vi.fn());
const clockIn = vi.hoisted(() => vi.fn());
const clockOut = vi.hoisted(() => vi.fn());
const startBreak = vi.hoisted(() => vi.fn());
const endBreak = vi.hoisted(() => vi.fn());
const switchTask = vi.hoisted(() => vi.fn());
const fetchTasks = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/workSessions.js", () => ({
  fetchActiveSession,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  switchTask,
}));
vi.mock("../../src/api/tasks.js", () => ({ fetchTasks }));

function task(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: "t1",
    projectId: "p1",
    assigneeId: "u1",
    createdBy: "s1",
    title: "Preparar demo",
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

function session(overrides: Partial<WorkSessionDTO> = {}): WorkSessionDTO {
  return {
    id: "s1",
    userId: "u1",
    startedAt: "2026-01-01T09:00:00.000Z",
    endedAt: null,
    workedMinutes: 30,
    breaks: [],
    taskSegments: [],
    ...overrides,
  };
}

function noActiveSession(): ActiveSessionResponse {
  return { activeSession: null };
}

describe("ClockWidget", () => {
  beforeEach(() => {
    fetchTasks.mockReset().mockResolvedValue([task()]);
    fetchActiveSession.mockReset().mockResolvedValue(noActiveSession());
    clockIn.mockReset().mockResolvedValue(session());
    clockOut.mockReset().mockResolvedValue(session({ endedAt: "2026-01-01T17:00:00.000Z" }));
    startBreak.mockReset().mockResolvedValue(session());
    endBreak.mockReset().mockResolvedValue(session());
    switchTask.mockReset().mockResolvedValue(session());
  });

  it("antes de fichar entrada, ofrece elegir tarea y descripción", async () => {
    render(<ClockWidget />);
    expect(await screen.findByText("No has fichado entrada todavía.")).toBeInTheDocument();
    expect(screen.getByLabelText("Tarea (opcional)")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Preparar demo" })).toBeInTheDocument();
  });

  it("ficha entrada con la tarea y descripción elegidas", async () => {
    const user = userEvent.setup();
    render(<ClockWidget />);
    await screen.findByText("No has fichado entrada todavía.");

    await user.selectOptions(screen.getByLabelText("Tarea (opcional)"), "t1");
    await user.type(screen.getByPlaceholderText("Breve descripción"), "Revisar el guion");
    await user.click(screen.getByRole("button", { name: "Fichar entrada" }));

    await waitFor(() =>
      expect(clockIn).toHaveBeenCalledWith({ taskId: "t1", description: "Revisar el guion" }),
    );
  });

  it("muestra el tramo activo cuando ya está fichado con una tarea", async () => {
    fetchActiveSession.mockResolvedValue({
      activeSession: session({
        taskSegments: [
          {
            id: "seg1",
            workSessionId: "s1",
            taskId: "t1",
            taskTitle: "Preparar demo",
            description: "Revisar el guion",
            startedAt: "2026-01-01T09:00:00.000Z",
            endedAt: null,
          },
        ],
      }),
    });
    render(<ClockWidget />);
    expect(await screen.findByText("En: Preparar demo — Revisar el guion")).toBeInTheDocument();
  });

  it("cambia de tarea sin fichar salida", async () => {
    const user = userEvent.setup();
    fetchActiveSession.mockResolvedValue({ activeSession: session() });
    render(<ClockWidget />);
    await screen.findByText("Todavía no has indicado en qué estás trabajando.");

    await user.click(screen.getByRole("button", { name: "Cambiar de tarea" }));
    await user.selectOptions(screen.getByLabelText("Tarea (opcional)"), "t1");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(switchTask).toHaveBeenCalledWith({ taskId: "t1", description: null }));
  });

  it("ficha salida normalmente", async () => {
    const user = userEvent.setup();
    fetchActiveSession.mockResolvedValue({ activeSession: session() });
    render(<ClockWidget />);
    await screen.findByText("Todavía no has indicado en qué estás trabajando.");

    await user.click(screen.getByRole("button", { name: "Fichar salida" }));

    await waitFor(() => expect(clockOut).toHaveBeenCalled());
  });
});
