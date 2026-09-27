import type { PublicUser } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserMenu } from "../../src/components/UserMenu.js";

const navigate = vi.hoisted(() => vi.fn());
const logout = vi.hoisted(() => vi.fn());
let currentUser: PublicUser | null;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("../../src/auth/AuthContext.js", () => ({
  useAuth: () => ({ user: currentUser, logout }),
}));

function user(overrides: Partial<PublicUser> = {}): PublicUser {
  return {
    id: "u1",
    email: "juan@clearwork.test",
    fullName: "Juan Worker",
    role: "worker",
    weeklyTargetHours: 40,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    hireDate: "2026-01-01",
    contractType: "full_time",
    ...overrides,
  };
}

function renderMenu() {
  return render(
    <MemoryRouter>
      <UserMenu />
    </MemoryRouter>,
  );
}

describe("UserMenu", () => {
  beforeEach(() => {
    navigate.mockReset();
    logout.mockReset();
    currentUser = user();
  });

  it("no muestra nada cuando no hay usuario", () => {
    currentUser = null;
    const { container } = renderMenu();
    expect(container).toBeEmptyDOMElement();
  });

  it("el desplegable empieza cerrado", () => {
    renderMenu();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("al pulsar el avatar se abre el desplegable con el nombre y el rol", async () => {
    const clickUser = userEvent.setup();
    renderMenu();

    await clickUser.click(screen.getByRole("button", { name: "Menú de usuario" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Juan Worker")).toBeInTheDocument();
    expect(screen.getByText("Trabajador")).toBeInTheDocument();
  });

  it("al pulsar de nuevo el avatar se cierra el desplegable", async () => {
    const clickUser = userEvent.setup();
    renderMenu();

    const trigger = screen.getByRole("button", { name: "Menú de usuario" });
    await clickUser.click(trigger);
    await clickUser.click(trigger);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("el enlace 'Perfil' cierra el desplegable al pulsarlo", async () => {
    const clickUser = userEvent.setup();
    renderMenu();

    await clickUser.click(screen.getByRole("button", { name: "Menú de usuario" }));
    await clickUser.click(screen.getByRole("menuitem", { name: "Perfil" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("'Cerrar sesión' llama a logout y navega al login", async () => {
    const clickUser = userEvent.setup();
    renderMenu();

    await clickUser.click(screen.getByRole("button", { name: "Menú de usuario" }));
    await clickUser.click(screen.getByRole("menuitem", { name: "Cerrar sesión" }));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("cierra el desplegable al hacer clic fuera", async () => {
    const clickUser = userEvent.setup();
    renderMenu();

    await clickUser.click(screen.getByRole("button", { name: "Menú de usuario" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await clickUser.click(document.body);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("cierra el desplegable al pulsar Escape", async () => {
    const clickUser = userEvent.setup();
    renderMenu();

    await clickUser.click(screen.getByRole("button", { name: "Menú de usuario" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await clickUser.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
