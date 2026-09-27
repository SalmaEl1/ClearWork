import type { PublicUser } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../../src/auth/AuthContext.js";

const fetchCurrentUser = vi.hoisted(() => vi.fn());
const login = vi.hoisted(() => vi.fn());
const getStoredToken = vi.hoisted(() => vi.fn());
const setStoredToken = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/auth.js", () => ({ fetchCurrentUser, login }));
vi.mock("../../src/api/client.js", () => ({ getStoredToken, setStoredToken }));

const worker: PublicUser = {
  id: "u1",
  email: "worker@test.dev",
  fullName: "Juan Worker",
  role: "worker",
  weeklyTargetHours: 40,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  hireDate: "2026-01-01",
  contractType: "full_time",
};

function Consumer() {
  const { user, isLoading, login: doLogin, logout } = useAuth();
  return (
    <div>
      <p>{isLoading ? "Cargando" : "Listo"}</p>
      <p>{user ? user.email : "Sin sesión"}</p>
      <button onClick={() => doLogin({ email: "worker@test.dev", password: "secreta" })}>
        Entrar
      </button>
      <button onClick={() => logout()}>Salir</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    fetchCurrentUser.mockReset();
    login.mockReset();
    getStoredToken.mockReset();
    setStoredToken.mockReset();
  });

  it("sin token guardado, termina de cargar sin usuario y no llama a la API", async () => {
    getStoredToken.mockReturnValue(null);
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    expect(await screen.findByText("Listo")).toBeInTheDocument();
    expect(screen.getByText("Sin sesión")).toBeInTheDocument();
    expect(fetchCurrentUser).not.toHaveBeenCalled();
  });

  it("con token válido, carga el usuario actual al montar", async () => {
    getStoredToken.mockReturnValue("tok-123");
    fetchCurrentUser.mockResolvedValue(worker);
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    expect(await screen.findByText("worker@test.dev")).toBeInTheDocument();
    expect(screen.getByText("Listo")).toBeInTheDocument();
  });

  it("con token inválido, borra el token guardado y se queda sin usuario", async () => {
    getStoredToken.mockReturnValue("tok-expirado");
    fetchCurrentUser.mockRejectedValue(new Error("401"));
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    expect(await screen.findByText("Listo")).toBeInTheDocument();
    expect(screen.getByText("Sin sesión")).toBeInTheDocument();
    expect(setStoredToken).toHaveBeenCalledWith(null);
  });

  it("login() guarda el token y el usuario devueltos por la API", async () => {
    getStoredToken.mockReturnValue(null);
    login.mockResolvedValue({ token: "tok-nuevo", user: worker });
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await screen.findByText("Listo");

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(login).toHaveBeenCalledWith({ email: "worker@test.dev", password: "secreta" });
    expect(await screen.findByText("worker@test.dev")).toBeInTheDocument();
    expect(setStoredToken).toHaveBeenCalledWith("tok-nuevo");
  });

  it("logout() borra el token guardado y limpia el usuario", async () => {
    getStoredToken.mockReturnValue("tok-123");
    fetchCurrentUser.mockResolvedValue(worker);
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await screen.findByText("worker@test.dev");

    await user.click(screen.getByRole("button", { name: "Salir" }));

    expect(setStoredToken).toHaveBeenCalledWith(null);
    expect(screen.getByText("Sin sesión")).toBeInTheDocument();
  });

  it("useAuth() fuera de <AuthProvider> lanza un error", () => {
    // jsdom no tiene un error boundary por defecto: React re-lanza el error
    // también como evento "error" de window además de por consola, así que
    // hay que silenciar ambos para que el test no ensucie la salida.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const onWindowError = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener("error", onWindowError);

    expect(() => render(<Consumer />)).toThrow("useAuth debe usarse dentro de <AuthProvider>");

    window.removeEventListener("error", onWindowError);
    consoleError.mockRestore();
  });
});
