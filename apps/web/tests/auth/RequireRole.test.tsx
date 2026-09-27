import type { PublicUser, Role } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RequireRole } from "../../src/auth/RequireRole.js";

const useAuth = vi.hoisted(() => vi.fn());

vi.mock("../../src/auth/AuthContext.js", () => ({ useAuth }));

function user(role: Role): PublicUser {
  return {
    id: "u1",
    email: "u1@test.dev",
    fullName: "Test User",
    role,
    weeklyTargetHours: 40,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    hireDate: "2026-01-01",
    contractType: "full_time",
  };
}

function renderAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/worker" element={<RequireRole role="worker" />}>
          <Route index element={<p>Panel de trabajador</p>} />
        </Route>
        <Route path="/supervisor" element={<p>Panel de supervisor</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireRole", () => {
  it("renderiza el contenido si el usuario tiene el rol requerido", () => {
    useAuth.mockReturnValue({ user: user("worker") });
    renderAt("/worker");
    expect(screen.getByText("Panel de trabajador")).toBeInTheDocument();
  });

  it("redirige a la home del rol real si no coincide con el requerido", () => {
    useAuth.mockReturnValue({ user: user("supervisor") });
    renderAt("/worker");
    expect(screen.getByText("Panel de supervisor")).toBeInTheDocument();
    expect(screen.queryByText("Panel de trabajador")).not.toBeInTheDocument();
  });

  it("renderiza el contenido si no hay usuario todavía (lo filtra RequireAuth antes)", () => {
    useAuth.mockReturnValue({ user: null });
    renderAt("/worker");
    expect(screen.getByText("Panel de trabajador")).toBeInTheDocument();
  });
});
