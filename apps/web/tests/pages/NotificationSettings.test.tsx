import type { NotificationPreferenceDTO, PublicUser } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationSettings } from "../../src/pages/NotificationSettings.js";

const fetchNotificationPreferences = vi.hoisted(() => vi.fn());
const updateNotificationPreference = vi.hoisted(() => vi.fn());
const useAuth = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/notificationPreferences.js", () => ({
  fetchNotificationPreferences,
  updateNotificationPreference,
}));
vi.mock("../../src/auth/AuthContext.js", () => ({ useAuth }));

function user(role: PublicUser["role"]): PublicUser {
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

// Todos los tipos que existen hoy, como si el backend no filtrara nada
// — así el test cubre que el filtrado por rol ocurre también en el
// cliente (belt-and-suspenders con el backend).
const allPreferences: NotificationPreferenceDTO[] = [
  { type: "task_assigned", channel: "both" },
  { type: "vacation_requested", channel: "in_app" },
  { type: "document_shared", channel: "both" },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <NotificationSettings />
    </MemoryRouter>,
  );
}

describe("NotificationSettings", () => {
  beforeEach(() => {
    fetchNotificationPreferences.mockReset().mockResolvedValue(allPreferences);
    updateNotificationPreference.mockReset();
    useAuth.mockReset().mockReturnValue({ user: user("worker") });
  });

  it("lista solo los tipos que aplican al rol de quien ha entrado", async () => {
    renderPage();
    expect(await screen.findByText("Se le asigna una tarea")).toBeInTheDocument();
    expect(screen.getByText("Se comparte un documento con usted")).toBeInTheDocument();
    // "Alguien de su equipo solicita vacaciones" (vacation_requested) es
    // para el supervisor, no para el trabajador.
    expect(screen.queryByText("Alguien de su equipo solicita vacaciones")).not.toBeInTheDocument();
  });

  it("para el supervisor lista los tipos que le aplican a él", async () => {
    useAuth.mockReturnValue({ user: user("supervisor") });
    renderPage();
    expect(await screen.findByText("Alguien de su equipo solicita vacaciones")).toBeInTheDocument();
    expect(screen.queryByText("Se le asigna una tarea")).not.toBeInTheDocument();
  });

  it("para el admin no hay ningún tipo que personalizar", async () => {
    useAuth.mockReturnValue({ user: user("admin") });
    renderPage();
    expect(await screen.findByText("Tu rol no tiene notificaciones que personalizar.")).toBeInTheDocument();
  });

  it("cambia el canal de un tipo y muestra la confirmación de guardado", async () => {
    updateNotificationPreference.mockResolvedValue({ type: "task_assigned", channel: "none" });
    const testUser = userEvent.setup();
    renderPage();
    await screen.findByText("Se le asigna una tarea");

    await testUser.selectOptions(screen.getByLabelText("Medio para: Se le asigna una tarea"), "none");

    await waitFor(() => expect(updateNotificationPreference).toHaveBeenCalledWith("task_assigned", "none"));
    expect(await screen.findByText("Preferencia guardada.")).toBeInTheDocument();
  });

  it("muestra un error si falla la carga", async () => {
    fetchNotificationPreferences.mockRejectedValue(new Error("network down"));
    renderPage();
    expect(await screen.findByText("No se pudieron cargar las preferencias")).toBeInTheDocument();
  });
});
