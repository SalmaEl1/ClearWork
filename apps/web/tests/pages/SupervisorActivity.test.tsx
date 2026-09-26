import type { AdminActivityEventDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupervisorActivity } from "../../src/pages/supervisor/SupervisorActivity.js";

const fetchTeamActivity = vi.hoisted(() => vi.fn());
const exportTeamActivityCsv = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/supervisorActivity.js", () => ({ fetchTeamActivity, exportTeamActivityCsv }));

function page(items: AdminActivityEventDTO[] = []) {
  return { items, total: items.length, page: 1, pageSize: 10 };
}

const sampleEvent: AdminActivityEventDTO = {
  type: "task_created",
  occurredAt: "2026-01-01T10:00:00.000Z",
  userName: "Ana",
  taskTitle: "Diseñar login",
  projectName: "Web",
};

describe("SupervisorActivity", () => {
  beforeEach(() => {
    fetchTeamActivity.mockReset().mockResolvedValue(page([sampleEvent]));
    exportTeamActivityCsv.mockReset().mockResolvedValue(undefined);
  });

  it("de entrada pide la actividad del equipo sin filtrar por tipo", async () => {
    render(<SupervisorActivity />);
    await waitFor(() =>
      expect(fetchTeamActivity).toHaveBeenCalledWith({
        types: undefined,
        sortOrder: "newest",
        page: 1,
        pageSize: 10,
      }),
    );
  });

  it("no ofrece la categoría de cuentas, solo proyectos y tareas", async () => {
    render(<SupervisorActivity />);
    expect(await screen.findByRole("button", { name: "Todo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Proyectos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tareas" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cuentas" })).not.toBeInTheDocument();
  });

  it("muestra los eventos del equipo", async () => {
    render(<SupervisorActivity />);
    expect(await screen.findByText(/creó la tarea/)).toBeInTheDocument();
  });

  it("exporta a CSV respetando el filtro de categoría activo", async () => {
    const user = userEvent.setup();
    render(<SupervisorActivity />);
    await screen.findByRole("button", { name: "Todo" });

    await user.click(screen.getByRole("button", { name: "Tareas" }));
    await user.click(screen.getByRole("button", { name: "Exportar CSV" }));

    await waitFor(() =>
      expect(exportTeamActivityCsv).toHaveBeenCalledWith({
        types: ["task_created", "task_status_changed", "task_deleted"],
        sortOrder: "newest",
      }),
    );
  });
});
