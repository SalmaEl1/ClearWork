import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { Login } from "../../src/pages/Login.js";

const useAuth = vi.hoisted(() => vi.fn());
const login = vi.hoisted(() => vi.fn());

vi.mock("../../src/auth/AuthContext.js", () => ({ useAuth }));

function renderAt(entry: string | { pathname: string; state?: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<p>Inicio</p>} />
        <Route path="/worker" element={<p>Área trabajador</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Login", () => {
  beforeEach(() => {
    login.mockReset();
    useAuth.mockReset().mockReturnValue({ login });
  });

  it("muestra el formulario de inicio de sesión", () => {
    renderAt("/login");
    expect(screen.getByRole("heading", { name: "ClearWork" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toBeInTheDocument();
  });

  it("inicia sesión y navega a la home por defecto", async () => {
    login.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAt("/login");

    await user.type(screen.getByLabelText("Email"), "ana@test.dev");
    await user.type(screen.getByLabelText("Contraseña"), "secreta123");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(login).toHaveBeenCalledWith({ email: "ana@test.dev", password: "secreta123" });
    expect(await screen.findByText("Inicio")).toBeInTheDocument();
  });

  it("navega a la ruta de origen guardada en el estado de navegación", async () => {
    login.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAt({ pathname: "/login", state: { from: { pathname: "/worker" } } });

    await user.type(screen.getByLabelText("Email"), "ana@test.dev");
    await user.type(screen.getByLabelText("Contraseña"), "secreta123");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Área trabajador")).toBeInTheDocument();
  });

  it("muestra el mensaje de la API si el login falla con ApiError", async () => {
    login.mockRejectedValue(new ApiError("Credenciales incorrectas", 401));
    const user = userEvent.setup();
    renderAt("/login");

    await user.type(screen.getByLabelText("Email"), "ana@test.dev");
    await user.type(screen.getByLabelText("Contraseña"), "mala");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Credenciales incorrectas")).toBeInTheDocument();
    expect(screen.queryByText("Inicio")).not.toBeInTheDocument();
  });

  it("muestra un mensaje genérico si el fallo no es un ApiError", async () => {
    login.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderAt("/login");

    await user.type(screen.getByLabelText("Email"), "ana@test.dev");
    await user.type(screen.getByLabelText("Contraseña"), "mala");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("No se pudo iniciar sesión")).toBeInTheDocument();
  });
});
