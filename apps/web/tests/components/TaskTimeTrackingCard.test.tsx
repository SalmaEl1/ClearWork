import type { TaskTimeEntryDTO } from "@clearwork/shared";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskTimeTrackingCard } from "../../src/components/TaskTimeTrackingCard.js";

const logTaskTime = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/tasks.js", () => ({ logTaskTime }));

function entry(overrides: Partial<TaskTimeEntryDTO> = {}): TaskTimeEntryDTO {
  return {
    id: "e1",
    taskId: "t1",
    loggedBy: "u1",
    loggedByName: "Juan Worker",
    minutes: 90,
    description: "Investigación",
    loggedAt: "2026-03-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("TaskTimeTrackingCard", () => {
  beforeEach(() => {
    logTaskTime.mockReset().mockResolvedValue({});
  });

  it("muestra las horas estimadas, registradas y restantes", () => {
    render(
      <TaskTimeTrackingCard
        taskId="t1"
        estimatedHours={10}
        loggedMinutes={90}
        remainingHours={8.5}
        timeEntries={[]}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.getByText(/Estimadas: 10 h/)).toBeInTheDocument();
    expect(screen.getByText(/Registradas: 1h 30min/)).toBeInTheDocument();
    expect(screen.getByText(/Restantes: 8.5 h/)).toBeInTheDocument();
  });

  it("sin estimación, no muestra ni estimadas ni restantes", () => {
    render(
      <TaskTimeTrackingCard
        taskId="t1"
        estimatedHours={null}
        loggedMinutes={0}
        remainingHours={null}
        timeEntries={[]}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Estimadas/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Restantes/)).not.toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay entradas", () => {
    render(
      <TaskTimeTrackingCard
        taskId="t1"
        estimatedHours={null}
        loggedMinutes={0}
        remainingHours={null}
        timeEntries={[]}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.getByText("Todavía no se ha registrado tiempo en esta tarea.")).toBeInTheDocument();
  });

  it("lista las entradas ya registradas con quién y qué se hizo", () => {
    render(
      <TaskTimeTrackingCard
        taskId="t1"
        estimatedHours={null}
        loggedMinutes={90}
        remainingHours={null}
        timeEntries={[entry()]}
        onSaved={vi.fn()}
      />,
    );
    const item = screen.getByRole("listitem");
    expect(within(item).getByText(/Juan Worker/)).toBeInTheDocument();
    expect(within(item).getByText(/1h 30min/)).toBeInTheDocument();
    expect(within(item).getByText(/Investigación/)).toBeInTheDocument();
  });

  it("registra tiempo nuevo con la cantidad, unidad y descripción indicadas", async () => {
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(
      <TaskTimeTrackingCard
        taskId="t1"
        estimatedHours={null}
        loggedMinutes={0}
        remainingHours={null}
        timeEntries={[]}
        onSaved={onSaved}
      />,
    );

    await user.type(screen.getByLabelText("Cantidad"), "2");
    await user.selectOptions(screen.getByLabelText("Unidad"), "hours");
    await user.type(screen.getByLabelText("Qué se hizo"), "Diseño de la pantalla");
    await user.click(screen.getByRole("button", { name: "Registrar" }));

    await waitFor(() =>
      expect(logTaskTime).toHaveBeenCalledWith("t1", {
        amount: 2,
        unit: "hours",
        description: "Diseño de la pantalla",
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("muestra un error si falla el registro", async () => {
    logTaskTime.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    render(
      <TaskTimeTrackingCard
        taskId="t1"
        estimatedHours={null}
        loggedMinutes={0}
        remainingHours={null}
        timeEntries={[]}
        onSaved={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Cantidad"), "1");
    await user.type(screen.getByLabelText("Qué se hizo"), "Algo");
    await user.click(screen.getByRole("button", { name: "Registrar" }));

    expect(await screen.findByText("No se pudo registrar el tiempo")).toBeInTheDocument();
  });
});
