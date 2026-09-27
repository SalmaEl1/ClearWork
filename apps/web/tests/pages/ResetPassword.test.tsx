import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { ResetPassword } from "../../src/pages/ResetPassword.js";

const resetPassword = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/auth.js", () => ({ resetPassword }));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ResetPassword", () => {
  beforeEach(() => {
    resetPassword.mockReset();
  });

  it("sin token en la URL, muestra el aviso de enlace inválido y no el formulario", () => {
    renderAt("/reset-password");
    expect(screen.getByText(/Este enlace no es válido/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Contraseña nueva")).not.toBeInTheDocument();
  });

  it("con token, muestra el formulario de nueva contraseña", () => {
    renderAt("/reset-password?token=tok123");
    expect(screen.getByLabelText("Contraseña nueva")).toBeInTheDocument();
    expect(screen.getByLabelText("Repite la contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeInTheDocument();
  });

  it("si las contraseñas no coinciden, muestra el error y no llama a la API", async () => {
    const user = userEvent.setup();
    renderAt("/reset-password?token=tok123");

    await user.type(screen.getByLabelText("Contraseña nueva"), "password1");
    await user.type(screen.getByLabelText("Repite la contraseña"), "password2");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByText("Las dos contraseñas no coinciden")).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("con contraseñas coincidentes, llama a la API y muestra la confirmación", async () => {
    resetPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAt("/reset-password?token=tok123");

    await user.type(screen.getByLabelText("Contraseña nueva"), "password1");
    await user.type(screen.getByLabelText("Repite la contraseña"), "password1");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(resetPassword).toHaveBeenCalledWith({ token: "tok123", newPassword: "password1" });
    expect(await screen.findByText("Contraseña actualizada.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("muestra el mensaje de la API si falla con ApiError", async () => {
    resetPassword.mockRejectedValue(new ApiError("Token expirado", 400));
    const user = userEvent.setup();
    renderAt("/reset-password?token=tok123");

    await user.type(screen.getByLabelText("Contraseña nueva"), "password1");
    await user.type(screen.getByLabelText("Repite la contraseña"), "password1");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByText("Token expirado")).toBeInTheDocument();
  });

  it("muestra un mensaje genérico si el fallo no es un ApiError", async () => {
    resetPassword.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderAt("/reset-password?token=tok123");

    await user.type(screen.getByLabelText("Contraseña nueva"), "password1");
    await user.type(screen.getByLabelText("Repite la contraseña"), "password1");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByText("No se pudo cambiar la contraseña")).toBeInTheDocument();
  });
});
