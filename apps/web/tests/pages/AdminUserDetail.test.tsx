import type { AdminUserSummary, LeaveDTO, PublicUser } from "@clearwork/shared";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminUserDetail } from "../../src/pages/admin/AdminUserDetail.js";

const fetchAdminUser = vi.hoisted(() => vi.fn());
const updateAdminUser = vi.hoisted(() => vi.fn());
const deleteAdminUser = vi.hoisted(() => vi.fn());
const fetchLeaves = vi.hoisted(() => vi.fn());
const deleteLeave = vi.hoisted(() => vi.fn());
const createLeave = vi.hoisted(() => vi.fn());
const useAuth = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/admin.js", () => ({ fetchAdminUser, updateAdminUser, deleteAdminUser }));
vi.mock("../../src/api/leaves.js", () => ({ fetchLeaves, deleteLeave, createLeave, endLeave: vi.fn() }));
vi.mock("../../src/auth/AuthContext.js", () => ({ useAuth }));

const admin: PublicUser = {
  id: "admin1",
  email: "admin@test.dev",
  fullName: "Ada Admin",
  role: "admin",
  weeklyTargetHours: 40,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  hireDate: "2026-01-01",
  contractType: "full_time",
};

function makeUser(overrides: Partial<AdminUserSummary> = {}): AdminUserSummary {
  return {
    id: "u1",
    email: "u1@test.dev",
    fullName: "Juan Worker",
    role: "worker",
    isActive: true,
    weeklyTargetHours: 40,
    hireDate: "2026-01-01",
    contractType: "full_time",
    currentProjectId: null,
    currentProjectName: null,
    supervisedProjects: [],
    ...overrides,
  };
}

const worker = makeUser({
  id: "u1",
  fullName: "Juan Worker",
  role: "worker",
  currentProjectId: "p1",
  currentProjectName: "Proyecto A",
});

const supervisor = makeUser({
  id: "u2",
  fullName: "Sara Supervisor",
  role: "supervisor",
  supervisedProjects: [{ id: "p2", name: "Proyecto B" }],
});

function makeLeave(overrides: Partial<LeaveDTO> = {}): LeaveDTO {
  return {
    id: "l1",
    userId: "u1",
    type: "sick_leave",
    startDate: "2026-01-01",
    endDate: "2026-01-10",
    createdBy: "admin1",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage(id = "u1") {
  return render(
    <MemoryRouter initialEntries={[`/admin/users/${id}`]}>
      <Routes>
        <Route path="/admin/users/:id" element={<AdminUserDetail />} />
        <Route path="/admin/users" element={<p>Lista de usuarios</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminUserDetail", () => {
  beforeEach(() => {
    useAuth.mockReset().mockReturnValue({ user: admin });
    fetchAdminUser.mockReset().mockResolvedValue(worker);
    updateAdminUser.mockReset().mockResolvedValue(worker);
    deleteAdminUser.mockReset().mockResolvedValue(undefined);
    fetchLeaves.mockReset().mockResolvedValue([]);
    deleteLeave.mockReset().mockResolvedValue(undefined);
    createLeave.mockReset().mockResolvedValue(makeLeave());
  });

  it("muestra 'Cargando…' mientras llega la cuenta", () => {
    renderPage();
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("muestra la cabecera con rol, estado y fecha de contratación", async () => {
    renderPage();
    expect(await screen.findByText("Juan Worker")).toBeInTheDocument();
    expect(screen.getByText("Trabajador")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("Contratado el 2026-01-01")).toBeInTheDocument();
  });

  it("muestra el proyecto actual de un trabajador enlazado a su ficha", async () => {
    renderPage();
    await screen.findByText("Juan Worker");
    const link = screen.getByRole("link", { name: "Proyecto A" });
    expect(link).toHaveAttribute("href", "/admin/projects/p1");
  });

  it("indica que un trabajador sin proyecto no está asignado", async () => {
    fetchAdminUser.mockResolvedValue(worker);
    fetchAdminUser.mockResolvedValueOnce(
      makeUser({ id: "u1", fullName: "Juan Worker", role: "worker", currentProjectId: null, currentProjectName: null }),
    );
    renderPage();
    expect(await screen.findByText("No está asignado a ningún proyecto.")).toBeInTheDocument();
  });

  it("muestra el proyecto que supervisa un supervisor", async () => {
    fetchAdminUser.mockResolvedValue(supervisor);
    renderPage("u2");
    expect(await screen.findByText("Proyecto que supervisa")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Proyecto B" })).toHaveAttribute("href", "/admin/projects/p2");
  });

  it("no muestra tarjeta de proyecto ni de bajas para un admin", async () => {
    fetchAdminUser.mockResolvedValue(makeUser({ id: "u3", fullName: "Otro Admin", role: "admin" }));
    renderPage("u3");
    await screen.findByText("Otro Admin");
    expect(screen.queryByText("Proyecto")).not.toBeInTheDocument();
    expect(screen.queryByText("Bajas/permisos y ausencias")).not.toBeInTheDocument();
    expect(fetchLeaves).not.toHaveBeenCalled();
  });

  it("marca la propia cuenta y no deja desactivarla ni eliminarla", async () => {
    fetchAdminUser.mockResolvedValue(makeUser({ id: "admin1", fullName: "Ada Admin", role: "admin" }));
    renderPage("admin1");
    expect(await screen.findByText("Ada Admin (tú)")).toBeInTheDocument();
    expect(screen.getByLabelText("Cuenta activa")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Eliminar cuenta" })).toBeDisabled();
    expect(screen.getByText("No puedes eliminar tu propia cuenta de administrador.")).toBeInTheDocument();
  });

  it("guarda los cambios del formulario de edición", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Juan Worker");

    const nameInput = screen.getByLabelText("Nombre completo");
    await user.clear(nameInput);
    await user.type(nameInput, "Juan Editado");
    await user.click(screen.getByLabelText("Cuenta activa"));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(updateAdminUser).toHaveBeenCalledWith("u1", {
        fullName: "Juan Editado",
        email: "u1@test.dev",
        isActive: false,
        weeklyTargetHours: 40,
        hireDate: "2026-01-01",
        contractType: "full_time",
      }),
    );
    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
    expect(fetchAdminUser).toHaveBeenCalledTimes(2);
  });

  it("muestra un error si falla el guardado", async () => {
    const user = userEvent.setup();
    updateAdminUser.mockRejectedValue(new Error("boom"));
    renderPage();
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("No se pudo guardar")).toBeInTheDocument();
  });

  it("elimina la cuenta y vuelve al listado", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "Eliminar cuenta" }));
    const dialog = await screen.findByRole("dialog", { name: "Eliminar cuenta" });
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(deleteAdminUser).toHaveBeenCalledWith("u1"));
    expect(await screen.findByText("Lista de usuarios")).toBeInTheDocument();
  });

  it("muestra un error si falla la eliminación de la cuenta", async () => {
    const user = userEvent.setup();
    deleteAdminUser.mockRejectedValue(new Error("boom"));
    renderPage();
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "Eliminar cuenta" }));
    const dialog = await screen.findByRole("dialog", { name: "Eliminar cuenta" });
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("No se pudo eliminar")).toBeInTheDocument();
  });

  it("lista las bajas/permisos del trabajador", async () => {
    fetchLeaves.mockResolvedValue([makeLeave()]);
    renderPage();
    await screen.findByText("Juan Worker");

    expect(await screen.findByText("Enfermedad")).toBeInTheDocument();
    expect(screen.getByText("2026-01-01 – 2026-01-10")).toBeInTheDocument();
    expect(fetchLeaves).toHaveBeenCalledWith("u1");
  });

  it("indica cuando no hay bajas/permisos registradas", async () => {
    renderPage();
    await screen.findByText("Juan Worker");
    expect(
      await screen.findByText("No hay bajas/permisos ni ausencias registradas."),
    ).toBeInTheDocument();
  });

  it("elimina una baja/permiso", async () => {
    const user = userEvent.setup();
    fetchLeaves.mockResolvedValue([makeLeave()]);
    renderPage();
    await screen.findByText("Enfermedad");

    const leaveItem = screen.getByText("Enfermedad").closest("li") as HTMLElement;
    await user.click(within(leaveItem).getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("dialog", { name: "Eliminar baja/permiso" });
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(deleteLeave).toHaveBeenCalledWith("l1"));
    expect(fetchLeaves).toHaveBeenCalledTimes(2);
  });

  it("muestra un error si falla la carga de bajas/permisos", async () => {
    fetchLeaves.mockRejectedValue(new Error("boom"));
    renderPage();
    await screen.findByText("Juan Worker");
    expect(
      await screen.findByText("No se pudieron cargar las bajas/permisos"),
    ).toBeInTheDocument();
  });

  it("registra una nueva baja/permiso desde el modal", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "Registrar baja/permiso" }));
    const dialog = await screen.findByRole("dialog", { name: "Registrar baja/permiso" });

    await user.type(within(dialog).getByLabelText("Fecha de inicio"), "2026-03-01");
    await user.click(within(dialog).getByRole("button", { name: "Registrar baja/permiso" }));

    await waitFor(() =>
      expect(createLeave).toHaveBeenCalledWith({
        userId: "u1",
        type: "maternity_paternity",
        startDate: "2026-03-01",
        endDate: null,
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchLeaves).toHaveBeenCalledTimes(2);
  });

  it("muestra un aviso de error si falla la carga de la cuenta", async () => {
    fetchAdminUser.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByText("No se pudo cargar la cuenta")).toBeInTheDocument();
  });
});
