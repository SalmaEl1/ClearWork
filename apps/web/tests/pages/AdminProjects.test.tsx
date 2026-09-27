import type { AdminUserSummary, ProjectDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { AdminProjects } from "../../src/pages/admin/AdminProjects.js";

const fetchAdminProjects = vi.hoisted(() => vi.fn());
const fetchAllAdminUsers = vi.hoisted(() => vi.fn());
const createAdminProject = vi.hoisted(() => vi.fn());
const updateAdminProject = vi.hoisted(() => vi.fn());
const deleteAdminProject = vi.hoisted(() => vi.fn());
const exportAdminProjectsCsv = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/admin.js", () => ({
  fetchAdminProjects,
  fetchAllAdminUsers,
  createAdminProject,
  updateAdminProject,
  deleteAdminProject,
  exportAdminProjectsCsv,
}));

function page(items: ProjectDTO[], total = items.length) {
  return { items, total, page: 1, pageSize: 10 };
}

function makeProject(overrides: Partial<ProjectDTO> = {}): ProjectDTO {
  return {
    id: "p1",
    name: "Proyecto Uno",
    description: "Descripción",
    supervisorId: "s1",
    isArchived: false,
    clientName: "Cliente A",
    clientContact: "contacto@a.test",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const supervisor: AdminUserSummary = {
  id: "s1",
  email: "ana@clearwork.test",
  fullName: "Ana Supervisor",
  role: "supervisor",
  isActive: true,
  weeklyTargetHours: 40,
  hireDate: "2020-01-01",
  contractType: "full_time",
  currentProjectId: null,
  currentProjectName: null,
  supervisedProjects: [],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminProjects />
    </MemoryRouter>,
  );
}

describe("AdminProjects", () => {
  beforeEach(() => {
    fetchAdminProjects.mockReset().mockResolvedValue(page([makeProject()]));
    fetchAllAdminUsers.mockReset().mockResolvedValue([supervisor]);
    createAdminProject.mockReset().mockResolvedValue(makeProject());
    updateAdminProject.mockReset().mockResolvedValue(makeProject());
    deleteAdminProject.mockReset().mockResolvedValue(undefined);
    exportAdminProjectsCsv.mockReset().mockResolvedValue(undefined);
  });

  it("carga y lista los proyectos con el nombre de su supervisor/a", async () => {
    renderPage();
    expect(await screen.findByText("Proyecto Uno")).toBeInTheDocument();
    expect(screen.getByText("Ana Supervisor")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("de entrada pide la primera página sin filtros", async () => {
    renderPage();
    await waitFor(() =>
      expect(fetchAdminProjects).toHaveBeenCalledWith({
        search: undefined,
        archived: undefined,
        page: 1,
        pageSize: 10,
      }),
    );
  });

  it("muestra el estado vacío cuando no hay proyectos", async () => {
    fetchAdminProjects.mockResolvedValue(page([]));
    renderPage();
    expect(await screen.findByText("Todavía no hay proyectos.")).toBeInTheDocument();
  });

  it("buscar filtra por nombre o supervisor/a (con debounce)", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Proyecto Uno");

    await user.type(screen.getByPlaceholderText("Buscar por nombre o supervisor/a…"), "Uno");

    await waitFor(() =>
      expect(fetchAdminProjects).toHaveBeenLastCalledWith({
        search: "Uno",
        archived: undefined,
        page: 1,
        pageSize: 10,
      }),
    );
  });

  it("el filtro de archivado se manda tal cual a la API", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Proyecto Uno");

    await user.selectOptions(screen.getByDisplayValue("Todos"), "archived");

    await waitFor(() =>
      expect(fetchAdminProjects).toHaveBeenLastCalledWith({
        search: undefined,
        archived: true,
        page: 1,
        pageSize: 10,
      }),
    );
  });

  it("pide la página siguiente al pulsar 'Siguiente'", async () => {
    fetchAdminProjects.mockResolvedValue(page([makeProject()], 25));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Proyecto Uno");

    await user.click(screen.getByRole("button", { name: "Siguiente →" }));

    await waitFor(() =>
      expect(fetchAdminProjects).toHaveBeenLastCalledWith({
        search: undefined,
        archived: undefined,
        page: 2,
        pageSize: 10,
      }),
    );
  });

  it("crea un proyecto nuevo desde el formulario y recarga la lista", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Proyecto Uno");

    await user.click(screen.getByRole("button", { name: "+ Añadir proyecto" }));
    await user.type(screen.getByLabelText("Nombre"), "Proyecto Nuevo");
    await user.type(screen.getByLabelText("Cliente"), "Cliente Nuevo");
    await user.type(screen.getByLabelText("Contacto del cliente"), "contacto@nuevo.test");
    await user.click(screen.getByRole("button", { name: "Crear proyecto" }));

    await waitFor(() =>
      expect(createAdminProject).toHaveBeenCalledWith({
        name: "Proyecto Nuevo",
        description: null,
        supervisorId: "s1",
        clientName: "Cliente Nuevo",
        clientContact: "contacto@nuevo.test",
      }),
    );
    // El modal se cierra y se recarga la lista tras crear.
    await waitFor(() => expect(fetchAdminProjects).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("muestra el error de la API si falla la creación", async () => {
    createAdminProject.mockRejectedValue(new ApiError("El nombre ya existe", 409));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Proyecto Uno");

    await user.click(screen.getByRole("button", { name: "+ Añadir proyecto" }));
    await user.type(screen.getByLabelText("Nombre"), "Proyecto Nuevo");
    await user.type(screen.getByLabelText("Cliente"), "Cliente Nuevo");
    await user.type(screen.getByLabelText("Contacto del cliente"), "contacto@nuevo.test");
    await user.click(screen.getByRole("button", { name: "Crear proyecto" }));

    expect(await screen.findByText("El nombre ya existe")).toBeInTheDocument();
  });

  it("exporta a CSV respetando la búsqueda y el filtro activos", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Proyecto Uno");

    await user.type(screen.getByPlaceholderText("Buscar por nombre o supervisor/a…"), "Uno");
    await waitFor(() => expect(fetchAdminProjects).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Uno" })));

    await user.click(screen.getByRole("button", { name: "Exportar CSV" }));

    await waitFor(() =>
      expect(exportAdminProjectsCsv).toHaveBeenCalledWith({ search: "Uno", archived: undefined }),
    );
  });

  it("muestra un aviso si falla la carga de proyectos", async () => {
    fetchAdminProjects.mockRejectedValue(new ApiError("No se pudo cargar la lista", 500));
    renderPage();
    expect(await screen.findByText("No se pudo cargar la lista")).toBeInTheDocument();
  });

  it("seleccionar un proyecto muestra la barra de acciones masivas y permite archivarlo", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Proyecto Uno");

    await user.click(screen.getByLabelText("Seleccionar Proyecto Uno"));
    expect(screen.getByText("1 seleccionado(s)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Archivar" }));

    await waitFor(() => expect(updateAdminProject).toHaveBeenCalledWith("p1", { isArchived: true }));
  });

  it("seleccionar todos y eliminar pide confirmación antes de borrar", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Proyecto Uno");

    await user.click(screen.getByLabelText("Seleccionar todos"));
    await user.click(screen.getByRole("button", { name: "Eliminar seleccionados" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(deleteAdminProject).toHaveBeenCalledWith("p1"));
  });
});
