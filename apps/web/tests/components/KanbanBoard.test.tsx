import type { TaskDTO } from "@clearwork/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { KanbanBoard } from "../../src/components/KanbanBoard.js";

/** jsdom no trae una implementación real de DataTransfer para arrastrar
 * y soltar: se simula el mínimo que usa el propio componente
 * (setData/getData), igual que recomienda Testing Library para este caso. */
function fakeDataTransfer() {
  const data: Record<string, string> = {};
  return {
    setData: (key: string, value: string) => {
      data[key] = value;
    },
    getData: (key: string) => data[key] ?? "",
    effectAllowed: "",
  };
}

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

function renderBoard(props: Partial<Parameters<typeof KanbanBoard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <KanbanBoard
        tasks={props.tasks ?? []}
        taskLink={props.taskLink ?? ((t) => `/worker/tasks/${t.id}`)}
        assigneeName={props.assigneeName}
        onStatusChange={props.onStatusChange ?? vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("KanbanBoard", () => {
  it("muestra las tres columnas de estado, aunque no haya tareas", () => {
    renderBoard();
    expect(screen.getByText("pendiente (0)")).toBeInTheDocument();
    expect(screen.getByText("en curso (0)")).toBeInTheDocument();
    expect(screen.getByText("hecha (0)")).toBeInTheDocument();
  });

  it("agrupa cada tarea en la columna de su estado", () => {
    renderBoard({
      tasks: [
        task({ id: "t1", title: "Pendiente uno", status: "pending" }),
        task({ id: "t2", title: "En curso uno", status: "in_progress" }),
        task({ id: "t3", title: "Hecha uno", status: "done" }),
      ],
    });

    expect(screen.getByText("pendiente (1)")).toBeInTheDocument();
    expect(screen.getByText("en curso (1)")).toBeInTheDocument();
    expect(screen.getByText("hecha (1)")).toBeInTheDocument();
    expect(screen.getByText("Pendiente uno")).toBeInTheDocument();
    expect(screen.getByText("En curso uno")).toBeInTheDocument();
    expect(screen.getByText("Hecha uno")).toBeInTheDocument();
  });

  it("sin assigneeName, no muestra ningún responsable en la tarjeta", () => {
    renderBoard({ tasks: [task({ title: "Sin responsable visible" })] });
    expect(screen.queryByText("Sin asignar")).not.toBeInTheDocument();
  });

  it("con assigneeName, muestra el responsable de cada tarjeta", () => {
    renderBoard({
      tasks: [task({ title: "Con responsable", assigneeId: "u1" })],
      assigneeName: (id) => (id === "u1" ? "Juan Worker" : "Sin asignar"),
    });
    expect(screen.getByText("Juan Worker")).toBeInTheDocument();
  });

  it("cambiar el desplegable de una tarjeta avisa con la tarea y el estado nuevo", async () => {
    const onStatusChange = vi.fn();
    const t = task({ title: "Mover de columna", status: "pending" });
    const user = userEvent.setup();
    renderBoard({ tasks: [t], onStatusChange });

    await user.selectOptions(screen.getByLabelText("Estado de Mover de columna"), "in_progress");

    expect(onStatusChange).toHaveBeenCalledWith(t, "in_progress");
  });

  it("enlaza cada tarjeta a la ruta que le indique taskLink", () => {
    renderBoard({
      tasks: [task({ id: "t9", title: "Con enlace" })],
      taskLink: (t) => `/supervisor/tasks/${t.id}`,
    });
    expect(screen.getByRole("link", { name: "Con enlace" })).toHaveAttribute(
      "href",
      "/supervisor/tasks/t9",
    );
  });

  it("muestra 'Sin tareas' en una columna vacía", () => {
    renderBoard({ tasks: [task({ status: "pending" })] });
    const emptyMessages = screen.getAllByText("Sin tareas");
    expect(emptyMessages).toHaveLength(2); // en curso y hecha, vacías
  });

  it("no confunde columnas con el mismo texto entre tarjetas de distinto estado", () => {
    renderBoard({
      tasks: [task({ id: "t1", status: "pending" }), task({ id: "t2", status: "done" })],
    });
    // Cada tarjeta vive en su propia columna: comprobar que ambas están presentes.
    const links = screen.getAllByRole("link", { name: "Diseñar login" });
    expect(links).toHaveLength(2);
  });

  it("el desplegable de estado empieza en el valor actual de la tarea", () => {
    renderBoard({ tasks: [task({ title: "Estado actual", status: "in_progress" })] });
    expect(screen.getByLabelText("Estado de Estado actual")).toHaveValue("in_progress");
  });

  it("cada tarjeta muestra su propio progreso", () => {
    renderBoard({ tasks: [task({ progressPercentage: 40 })] });
    const fill = document.querySelector(".progress-bar__fill") as HTMLElement;
    expect(fill.style.width).toBe("40%");
  });

  it("arrastrar una tarjeta a otra columna avisa con la tarea y el estado nuevo", () => {
    const onStatusChange = vi.fn();
    const t = task({ title: "Arrastrar de columna", status: "pending" });
    renderBoard({ tasks: [t], onStatusChange });

    const card = screen.getByText("Arrastrar de columna").closest(".kanban-card") as HTMLElement;
    const doneColumn = screen.getByText("hecha (0)").closest(".kanban-column") as HTMLElement;
    const dataTransfer = fakeDataTransfer();

    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragOver(doneColumn, { dataTransfer });
    fireEvent.drop(doneColumn, { dataTransfer });

    expect(onStatusChange).toHaveBeenCalledWith(t, "done");
  });

  it("soltar en la misma columna de la que sale no avisa de ningún cambio", () => {
    const onStatusChange = vi.fn();
    const t = task({ title: "Misma columna", status: "pending" });
    renderBoard({ tasks: [t], onStatusChange });

    const card = screen.getByText("Misma columna").closest(".kanban-card") as HTMLElement;
    const pendingColumn = screen.getByText("pendiente (1)").closest(".kanban-column") as HTMLElement;
    const dataTransfer = fakeDataTransfer();

    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.drop(pendingColumn, { dataTransfer });

    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it("marca la columna sobre la que se arrastra como zona de destino", () => {
    const t = task({ title: "Sobrevolando" });
    renderBoard({ tasks: [t] });

    const card = screen.getByText("Sobrevolando").closest(".kanban-card") as HTMLElement;
    const doneColumn = screen.getByText("hecha (0)").closest(".kanban-column") as HTMLElement;
    const dataTransfer = fakeDataTransfer();

    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragOver(doneColumn, { dataTransfer });
    expect(doneColumn).toHaveClass("kanban-column--drop-target");

    fireEvent.dragLeave(doneColumn);
    expect(doneColumn).not.toHaveClass("kanban-column--drop-target");
  });

  it("marca la tarjeta que se está arrastrando y la desmarca al soltar", () => {
    const t = task({ title: "En vilo" });
    renderBoard({ tasks: [t] });

    const card = screen.getByText("En vilo").closest(".kanban-card") as HTMLElement;
    const dataTransfer = fakeDataTransfer();

    fireEvent.dragStart(card, { dataTransfer });
    expect(card).toHaveClass("kanban-card--dragging");

    fireEvent.dragEnd(card);
    expect(card).not.toHaveClass("kanban-card--dragging");
  });
});
