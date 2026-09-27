import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { ChangePassword } from "../../src/pages/ChangePassword.js";

const changePassword = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/auth.js", () => ({ changePassword }));

function renderPage() {
  return render(
    <MemoryRouter>
      <ChangePassword />
    </MemoryRouter>,
  );
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  { current, next, confirm }: { current: string; next: string; confirm: string },
) {
  await user.type(screen.getByLabelText("Contraseña actual"), current);
  await user.type(screen.getByLabelText("Contraseña nueva"), next);
  await user.type(screen.getByLabelText("Confirmar contraseña nueva"), confirm);
}

describe("ChangePassword", () => {
  beforeEach(() => {
    changePassword.mockReset();
  });

  it("muestra el formulario y el enlace de vuelta al perfil", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "Volver a mi perfil" })).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña actual")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña nueva")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar contraseña nueva")).toBeInTheDocument();
  });

  it("si la nueva contraseña y la confirmación no coinciden, muestra el error", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillForm(user, { current: "actual123", next: "nueva1234", confirm: "otra12345" });
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(
      await screen.findByText("La contraseña nueva no coincide con la confirmación"),
    ).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("si la nueva contraseña es igual a la actual, muestra el error", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillForm(user, { current: "igual1234", next: "igual1234", confirm: "igual1234" });
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(
      await screen.findByText("La contraseña nueva debe ser distinta a la actual"),
    ).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("con datos válidos, llama a la API, muestra éxito y limpia el formulario", async () => {
    changePassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await fillForm(user, { current: "actual123", next: "nueva1234", confirm: "nueva1234" });
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: "actual123",
      newPassword: "nueva1234",
    });
    expect(await screen.findByText("Contraseña actualizada.")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña actual")).toHaveValue("");
    expect(screen.getByLabelText("Contraseña nueva")).toHaveValue("");
    expect(screen.getByLabelText("Confirmar contraseña nueva")).toHaveValue("");
  });

  it("muestra el mensaje de la API si falla con ApiError", async () => {
    changePassword.mockRejectedValue(new ApiError("Contraseña actual incorrecta", 400));
    const user = userEvent.setup();
    renderPage();

    await fillForm(user, { current: "actualmal", next: "nueva1234", confirm: "nueva1234" });
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByText("Contraseña actual incorrecta")).toBeInTheDocument();
  });

  it("muestra un mensaje genérico si el fallo no es un ApiError", async () => {
    changePassword.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderPage();

    await fillForm(user, { current: "actual123", next: "nueva1234", confirm: "nueva1234" });
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByText("No se pudo cambiar la contraseña")).toBeInTheDocument();
  });
});
