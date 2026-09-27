import type { AdminUserSummary, PublicUser } from "@clearwork/shared";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { todayDateString } from "../../src/lib/dates.js";
import { AdminUsers } from "../../src/pages/admin/AdminUsers.js";

const fetchAdminUsers = vi.hoisted(() => vi.fn());
const createAdminUser = vi.hoisted(() => vi.fn());
const deleteAdminUser = vi.hoisted(() => vi.fn());
const exportAdminUsersCsv = vi.hoisted(() => vi.fn());
const useAuth = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/admin.js", () => ({
  fetchAdminUsers,
  createAdminUser,
  deleteAdminUser,
  exportAdminUsersCsv,
}));
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

const worker = makeUser({ id: "u1", fullName: "Juan Worker", role: "worker", currentProjectName: "Proyecto A" });
const supervisor = makeUser({
  id: "u2",
  fullName: "Sara Supervisor",
  role: "supervisor",
  supervisedProjects: [{ id: "p1", name: "Proyecto B" }],
});
const self = makeUser({ id: "admin1", fullName: "Ada Admin", role: "admin" });

function usersPage(items: AdminUserSummary[], total = items.length) {
  return { items, total };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminUsers />
    </MemoryRouter>,
  );
}

describe("AdminUsers", () => {
  beforeEach(() => {
    useAuth.mockReset().mockReturnValue({ user: admin });
    fetchAdminUsers.mockReset().mockResolvedValue(usersPage([self, worker, supervisor]));
    createAdminUser.mockReset();
    deleteAdminUser.mockReset().mockResolvedValue(undefined);
    exportAdminUsersCsv.mockReset().mockResolvedValue(undefined);
  });

  it("pide la primera página sin filtros al cargar", async () => {
    renderPage();
    await waitFor(() =>
      expect(fetchAdminUsers).toHaveBeenCalledWith({
        search: undefined,
        role: undefined,
        page: 1,
        pageSize: 10,
      }),
    );
  });

  it("muestra 'Cargando…' mientras llega la lista", () => {
    renderPage();
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("lista las cuentas con su rol y proyecto", async () => {
    renderPage();
    expect(await screen.findByText("Juan Worker")).toBeInTheDocument();
    const workerRow = screen.getByText("Juan Worker").closest("tr") as HTMLElement;
    expect(within(workerRow).getByText("Trabajador")).toBeInTheDocument();
    expect(within(workerRow).getByText("Proyecto A")).toBeInTheDocument();

    const supervisorRow = screen.getByText("Sara Supervisor").closest("tr") as HTMLElement;
    expect(within(supervisorRow).getByText("Proyecto B")).toBeInTheDocument();
  });

  it("marca la propia cuenta como '(tú)' y no permite seleccionarla ni eliminarla", async () => {
    renderPage();
    await screen.findByText("Juan Worker");
    const selfRow = screen.getByText("Ada Admin (tú)").closest("tr") as HTMLElement;
    expect(within(selfRow).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(within(selfRow).getByRole("button", { name: "Eliminar" })).toBeDisabled();
  });

  it("muestra un mensaje cuando no hay ninguna cuenta", async () => {
    fetchAdminUsers.mockResolvedValue(usersPage([]));
    renderPage();
    expect(await screen.findByText("Todavía no hay supervisores ni trabajadores.")).toBeInTheDocument();
  });

  it("busca por nombre o email tras una pausa al escribir", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Juan Worker");

    await user.type(screen.getByPlaceholderText("Buscar por nombre o email…"), "juan");

    await waitFor(
      () =>
        expect(fetchAdminUsers).toHaveBeenLastCalledWith({
          search: "juan",
          role: undefined,
          page: 1,
          pageSize: 10,
        }),
      { timeout: 2000 },
    );
  });

  it("filtra por rol", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Juan Worker");

    await user.selectOptions(screen.getByDisplayValue("Todos los roles"), "supervisor");

    await waitFor(() =>
      expect(fetchAdminUsers).toHaveBeenLastCalledWith({
        search: undefined,
        role: "supervisor",
        page: 1,
        pageSize: 10,
      }),
    );
  });

  it("pagina hacia la siguiente página", async () => {
    const user = userEvent.setup();
    fetchAdminUsers.mockResolvedValue(usersPage([worker], 25));
    renderPage();
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "Siguiente →" }));

    await waitFor(() =>
      expect(fetchAdminUsers).toHaveBeenLastCalledWith({
        search: undefined,
        role: undefined,
        page: 2,
        pageSize: 10,
      }),
    );
  });

  it("exporta a CSV respetando la búsqueda y el rol activos", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Juan Worker");

    await user.selectOptions(screen.getByDisplayValue("Todos los roles"), "worker");
    await waitFor(() => expect(fetchAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ role: "worker" })));

    await user.click(screen.getByRole("button", { name: "Exportar CSV" }));

    await waitFor(() =>
      expect(exportAdminUsersCsv).toHaveBeenCalledWith({ search: undefined, role: "worker" }),
    );
  });

  it("crea una cuenta y muestra el aviso de correo enviado", async () => {
    const user = userEvent.setup();
    createAdminUser.mockResolvedValue({
      ...worker,
      email: "nuevo@test.dev",
      passwordEmailSent: true,
    });
    renderPage();
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "+ Añadir cuenta" }));
    const dialog = await screen.findByRole("dialog", { name: "Crear cuenta" });

    await user.type(within(dialog).getByLabelText("Nombre completo"), "Nuevo Usuario");
    await user.type(within(dialog).getByLabelText("Email"), "nuevo@test.dev");
    await user.click(within(dialog).getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() =>
      expect(createAdminUser).toHaveBeenCalledWith({
        email: "nuevo@test.dev",
        fullName: "Nuevo Usuario",
        role: "worker",
        weeklyTargetHours: 40,
        hireDate: todayDateString(),
        contractType: "full_time",
      }),
    );

    expect(
      await within(dialog).findByText((content, el) => el?.textContent === "Cuenta creada. Se ha enviado un correo a nuevo@test.dev con la contraseña provisional."),
    ).toBeInTheDocument();

    // Aceptar cierra el modal y recarga la lista.
    await user.click(within(dialog).getByRole("button", { name: "Aceptar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchAdminUsers).toHaveBeenCalledTimes(2);
  });

  it("si no se pudo enviar el correo, revela la contraseña provisional", async () => {
    const user = userEvent.setup();
    createAdminUser.mockResolvedValue({
      ...worker,
      passwordEmailSent: false,
      temporaryPassword: "abc123",
    });
    renderPage();
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "+ Añadir cuenta" }));
    const dialog = await screen.findByRole("dialog", { name: "Crear cuenta" });
    await user.type(within(dialog).getByLabelText("Nombre completo"), "Nuevo Usuario");
    await user.type(within(dialog).getByLabelText("Email"), "nuevo@test.dev");
    await user.click(within(dialog).getByRole("button", { name: "Crear cuenta" }));

    expect(await within(dialog).findByText("abc123")).toBeInTheDocument();
  });

  it("muestra un error si falla la creación de la cuenta", async () => {
    const user = userEvent.setup();
    createAdminUser.mockRejectedValue(new Error("boom"));
    renderPage();
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("button", { name: "+ Añadir cuenta" }));
    const dialog = await screen.findByRole("dialog", { name: "Crear cuenta" });
    await user.type(within(dialog).getByLabelText("Nombre completo"), "Nuevo Usuario");
    await user.type(within(dialog).getByLabelText("Email"), "nuevo@test.dev");
    await user.click(within(dialog).getByRole("button", { name: "Crear cuenta" }));

    expect(await within(dialog).findByText("No se pudo crear la cuenta")).toBeInTheDocument();
  });

  it("elimina una cuenta tras confirmar", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Juan Worker");

    const workerRow = screen.getByText("Juan Worker").closest("tr") as HTMLElement;
    await user.click(within(workerRow).getByRole("button", { name: "Eliminar" }));

    const dialog = await screen.findByRole("dialog", { name: "Eliminar cuenta" });
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(deleteAdminUser).toHaveBeenCalledWith("u1"));
    expect(fetchAdminUsers).toHaveBeenCalledTimes(2);
  });

  it("selecciona varias cuentas y las elimina en bloque", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("checkbox", { name: "Seleccionar a Juan Worker" }));
    await user.click(screen.getByRole("checkbox", { name: "Seleccionar a Sara Supervisor" }));

    expect(screen.getByText("2 seleccionado(s)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar seleccionados" }));
    const dialog = await screen.findByRole("dialog", { name: "Eliminar cuentas seleccionadas" });
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(deleteAdminUser).toHaveBeenCalledWith("u1"));
    expect(deleteAdminUser).toHaveBeenCalledWith("u2");
  });

  it("selecciona todos con la casilla de cabecera, sin incluir la propia cuenta", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Juan Worker");

    await user.click(screen.getByRole("checkbox", { name: "Seleccionar todos" }));
    expect(screen.getByText("2 seleccionado(s)")).toBeInTheDocument();
  });

  it("muestra un aviso de error si falla la carga de la lista", async () => {
    fetchAdminUsers.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByText("No se pudo cargar la lista")).toBeInTheDocument();
  });
});
