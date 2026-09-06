import type { AdminActivityEventDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminActivity } from "../../src/pages/admin/AdminActivity.js";

const fetchAdminActivity = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/admin.js", () => ({ fetchAdminActivity }));

function page(items: AdminActivityEventDTO[] = []) {
  return { items, total: items.length, page: 1, pageSize: 10 };
}

const sampleEvent: AdminActivityEventDTO = {
  type: "user_created",
  occurredAt: "2026-01-01T10:00:00.000Z",
  userName: "Ana",
  role: "worker",
};

describe("AdminActivity", () => {
  beforeEach(() => {
    fetchAdminActivity.mockReset().mockResolvedValue(page([sampleEvent]));
  });

  it("de entrada pide todo sin filtrar por tipo, más recientes primero", async () => {
    render(<AdminActivity />);
    await waitFor(() =>
      expect(fetchAdminActivity).toHaveBeenCalledWith({
        types: undefined,
        sortOrder: "newest",
        page: 1,
        pageSize: 10,
      }),
    );
  });

  it("no muestra ya un desplegable de filtro", async () => {
    render(<AdminActivity />);
    await screen.findByText("Todo");
    expect(screen.queryByRole("combobox", { name: /tipo/i })).not.toBeInTheDocument();
  });

  it("muestra un botón por categoría, arriba del todo", async () => {
    render(<AdminActivity />);
    expect(await screen.findByRole("button", { name: "Todo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cuentas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Proyectos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tareas" })).toBeInTheDocument();
  });

  it("al elegir 'Todo' no hay sub-filtro visible", async () => {
    render(<AdminActivity />);
    await screen.findByRole("button", { name: "Todo" });
    expect(screen.queryByRole("button", { name: "Altas" })).not.toBeInTheDocument();
  });

  it("al elegir una categoría aparece su sub-filtro, con 'Todos' y cada tipo", async () => {
    const user = userEvent.setup();
    render(<AdminActivity />);
    await screen.findByRole("button", { name: "Todo" });

    await user.click(screen.getByRole("button", { name: "Cuentas" }));

    expect(screen.getByRole("button", { name: "Todos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bajas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cambios de rol" })).toBeInTheDocument();
    // No se cuela un tipo de otra categoría.
    expect(screen.queryByRole("button", { name: "Archivados/desarchivados" })).not.toBeInTheDocument();
  });

  it("elegir una categoría con 'Todos' pide sus tipos juntos", async () => {
    const user = userEvent.setup();
    render(<AdminActivity />);
    await screen.findByRole("button", { name: "Todo" });

    await user.click(screen.getByRole("button", { name: "Tareas" }));

    await waitFor(() =>
      expect(fetchAdminActivity).toHaveBeenLastCalledWith({
        types: ["task_created", "task_status_changed", "task_deleted"],
        sortOrder: "newest",
        page: 1,
        pageSize: 10,
      }),
    );
  });

  it("elegir un tipo concreto dentro de una categoría pide solo ese", async () => {
    const user = userEvent.setup();
    render(<AdminActivity />);
    await screen.findByRole("button", { name: "Todo" });

    await user.click(screen.getByRole("button", { name: "Cuentas" }));
    await user.click(screen.getByRole("button", { name: "Bajas" }));

    await waitFor(() =>
      expect(fetchAdminActivity).toHaveBeenLastCalledWith({
        types: ["user_deleted"],
        sortOrder: "newest",
        page: 1,
        pageSize: 10,
      }),
    );
  });

  it("volver a 'Todo' quita el filtro de tipo", async () => {
    const user = userEvent.setup();
    render(<AdminActivity />);
    await screen.findByRole("button", { name: "Todo" });

    await user.click(screen.getByRole("button", { name: "Cuentas" }));
    await user.click(screen.getByRole("button", { name: "Todo" }));

    await waitFor(() =>
      expect(fetchAdminActivity).toHaveBeenLastCalledWith({
        types: undefined,
        sortOrder: "newest",
        page: 1,
        pageSize: 10,
      }),
    );
    expect(screen.queryByRole("button", { name: "Bajas" })).not.toBeInTheDocument();
  });

  it("el botón de orden empieza en 'más recientes primero' y se puede invertir", async () => {
    const user = userEvent.setup();
    render(<AdminActivity />);
    await screen.findByRole("button", { name: /Más recientes primero/ });

    await user.click(screen.getByRole("button", { name: /Más recientes primero/ }));

    await waitFor(() =>
      expect(fetchAdminActivity).toHaveBeenLastCalledWith({
        types: undefined,
        sortOrder: "oldest",
        page: 1,
        pageSize: 10,
      }),
    );
    expect(screen.getByRole("button", { name: /Más antiguas primero/ })).toBeInTheDocument();
  });
});
