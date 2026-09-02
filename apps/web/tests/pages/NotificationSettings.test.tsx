import type { NotificationPreferenceDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationSettings } from "../../src/pages/NotificationSettings.js";

const fetchNotificationPreferences = vi.hoisted(() => vi.fn());
const updateNotificationPreference = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/notificationPreferences.js", () => ({
  fetchNotificationPreferences,
  updateNotificationPreference,
}));

const preferences: NotificationPreferenceDTO[] = [
  { type: "task_assigned", channel: "both" },
  { type: "vacation_requested", channel: "in_app" },
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
    fetchNotificationPreferences.mockReset().mockResolvedValue(preferences);
    updateNotificationPreference.mockReset();
  });

  it("lista una preferencia por cada tipo de notificación con su canal actual", async () => {
    renderPage();
    expect(await screen.findByText("Se le asigna una tarea")).toBeInTheDocument();
    expect(screen.getByText("Alguien de su equipo solicita vacaciones")).toBeInTheDocument();
    expect(screen.getByLabelText("Medio para: Se le asigna una tarea")).toHaveValue("both");
    expect(screen.getByLabelText("Medio para: Alguien de su equipo solicita vacaciones")).toHaveValue("in_app");
  });

  it("cambia el canal de un tipo y muestra la confirmación de guardado", async () => {
    updateNotificationPreference.mockResolvedValue({ type: "task_assigned", channel: "none" });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Se le asigna una tarea");

    await user.selectOptions(screen.getByLabelText("Medio para: Se le asigna una tarea"), "none");

    await waitFor(() => expect(updateNotificationPreference).toHaveBeenCalledWith("task_assigned", "none"));
    expect(await screen.findByText("Preferencia guardada.")).toBeInTheDocument();
  });

  it("muestra un error si falla la carga", async () => {
    fetchNotificationPreferences.mockRejectedValue(new Error("network down"));
    renderPage();
    expect(await screen.findByText("No se pudieron cargar las preferencias")).toBeInTheDocument();
  });
});
