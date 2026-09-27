import type { PublicUser } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RequireAuth } from "../../src/auth/RequireAuth.js";

const useAuth = vi.hoisted(() => vi.fn());

vi.mock("../../src/auth/AuthContext.js", () => ({ useAuth }));

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

function renderAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/worker" element={<p>Área protegida</p>} />
        </Route>
        <Route path="/login" element={<p>Página de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  it("muestra un mensaje de carga mientras se comprueba la sesión", () => {
    useAuth.mockReturnValue({ user: null, isLoading: true });
    renderAt("/worker");
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
    expect(screen.queryByText("Área protegida")).not.toBeInTheDocument();
  });

  it("redirige a /login si no hay usuario", () => {
    useAuth.mockReturnValue({ user: null, isLoading: false });
    renderAt("/worker");
    expect(screen.getByText("Página de login")).toBeInTheDocument();
    expect(screen.queryByText("Área protegida")).not.toBeInTheDocument();
  });

  it("renderiza la ruta protegida si hay sesión iniciada", () => {
    useAuth.mockReturnValue({ user: worker, isLoading: false });
    renderAt("/worker");
    expect(screen.getByText("Área protegida")).toBeInTheDocument();
  });
});
