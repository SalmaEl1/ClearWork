import type { MeResponse } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { Profile } from "../../src/pages/Profile.js";

const fetchCurrentUser = vi.hoisted(() => vi.fn());
const updateProfile = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/auth.js", () => ({ fetchCurrentUser, updateProfile }));

function worker(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    id: "u1",
    email: "juan@test.dev",
    fullName: "Juan Worker",
    role: "worker",
    weeklyTargetHours: 40,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    hireDate: "2026-01-01",
    contractType: "full_time",
    supervisorName: "Ana Supervisor",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );
}

describe("Profile", () => {
  beforeEach(() => {
    fetchCurrentUser.mockReset();
    updateProfile.mockReset();
  });

  it("muestra los datos del perfil de un trabajador, incluida su supervisora", async () => {
    fetchCurrentUser.mockResolvedValue(worker());
    renderPage();

    expect(await screen.findByDisplayValue("Juan Worker")).toBeInTheDocument();
    expect(screen.getByDisplayValue("juan@test.dev")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Trabajador")).toBeInTheDocument();
    expect(screen.getByDisplayValue("40 h")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ana Supervisor")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jornada completa")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cambiar contraseña" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gestionar notificaciones" })).toBeInTheDocument();
  });

  it("muestra 'Sin asignar' cuando el trabajador no tiene supervisor", async () => {
    fetchCurrentUser.mockResolvedValue(worker({ supervisorName: null }));
    renderPage();

    expect(await screen.findByDisplayValue("Sin asignar")).toBeInTheDocument();
  });

  it("no muestra los campos de trabajador para un supervisor", async () => {
    fetchCurrentUser.mockResolvedValue(
      worker({ role: "supervisor", supervisorName: null, weeklyTargetHours: 0 }),
    );
    renderPage();

    await screen.findByDisplayValue("Juan Worker");
    expect(screen.queryByText("Horas objetivo semanales")).not.toBeInTheDocument();
    expect(screen.queryByText("Supervisor/a")).not.toBeInTheDocument();
  });

  it("muestra un error si falla la carga del perfil con ApiError", async () => {
    fetchCurrentUser.mockRejectedValue(new ApiError("No autorizado", 401));
    renderPage();
    expect(await screen.findByText("No autorizado")).toBeInTheDocument();
  });

  it("muestra un mensaje genérico si la carga falla sin ApiError", async () => {
    fetchCurrentUser.mockRejectedValue(new Error("network down"));
    renderPage();
    expect(await screen.findByText("No se pudo cargar tu perfil")).toBeInTheDocument();
  });

  it("guarda los cambios del formulario y recarga el perfil", async () => {
    fetchCurrentUser.mockResolvedValue(worker());
    updateProfile.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    const nameInput = await screen.findByDisplayValue("Juan Worker");
    await user.clear(nameInput);
    await user.type(nameInput, "Juan Actualizado");
    await user.click(screen.getByRole("button", { name: /Guardar cambios/ }));

    expect(updateProfile).toHaveBeenCalledWith({
      fullName: "Juan Actualizado",
      email: "juan@test.dev",
    });
    expect(await screen.findByText("Perfil actualizado.")).toBeInTheDocument();
    // onSaved() vuelve a pedir el perfil actual.
    expect(fetchCurrentUser).toHaveBeenCalledTimes(2);
  });

  it("muestra un error si falla el guardado del formulario", async () => {
    fetchCurrentUser.mockResolvedValue(worker());
    updateProfile.mockRejectedValue(new ApiError("Email ya en uso", 409));
    const user = userEvent.setup();
    renderPage();

    await screen.findByDisplayValue("Juan Worker");
    await user.click(screen.getByRole("button", { name: /Guardar cambios/ }));

    expect(await screen.findByText("Email ya en uso")).toBeInTheDocument();
  });
});
