import type { TaskHistoryEntryDTO } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaskHistoryList } from "../../src/components/TaskHistoryList.js";

describe("TaskHistoryList", () => {
  it("muestra el mensaje vacío cuando no hay historial", () => {
    render(<TaskHistoryList history={[]} />);
    expect(screen.getByText("Todavía no ha cambiado de estado.")).toBeInTheDocument();
  });

  it("muestra la creación como primer punto", () => {
    const history: TaskHistoryEntryDTO[] = [
      { kind: "created", changedBy: "u1", changedByName: "Ana Supervisor", changedAt: "2026-01-01T10:00:00.000Z" },
    ];
    render(<TaskHistoryList history={history} />);
    expect(screen.getByText("Ana Supervisor creó la tarea")).toBeInTheDocument();
  });

  it("muestra un cambio de estado, con el estado anterior si lo hay", () => {
    const history: TaskHistoryEntryDTO[] = [
      {
        kind: "status",
        id: "h1",
        fromStatus: "pending",
        toStatus: "in_progress",
        changedBy: "u1",
        changedByName: "Juan Worker",
        workSessionId: null,
        changedAt: "2026-01-02T10:00:00.000Z",
      },
    ];
    render(<TaskHistoryList history={history} />);
    expect(screen.getByText("Juan Worker la marcó como en curso (antes pendiente)")).toBeInTheDocument();
  });

  it("muestra un cambio de avance con los porcentajes", () => {
    const history: TaskHistoryEntryDTO[] = [
      {
        kind: "progress",
        id: "h2",
        fromProgressPercentage: 0,
        toProgressPercentage: 40,
        changedBy: "u1",
        changedByName: "Juan Worker",
        workSessionId: null,
        changedAt: "2026-01-03T10:00:00.000Z",
      },
    ];
    render(<TaskHistoryList history={history} />);
    expect(screen.getByText("Juan Worker actualizó el avance al 40% (antes 0%)")).toBeInTheDocument();
  });
});
