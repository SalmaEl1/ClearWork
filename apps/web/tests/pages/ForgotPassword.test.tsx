import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { ForgotPassword } from "../../src/pages/ForgotPassword.js";

const forgotPassword = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/auth.js", () => ({ forgotPassword }));

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>,
  );
}

describe("ForgotPassword", () => {
  beforeEach(() => {
    forgotPassword.mockReset();
  });

  it("muestra el formulario con el email y el enlace de vuelta al login", () => {
    renderPage();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar enlace" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a iniciar sesión" })).toBeInTheDocument();
  });

  it("al enviar con éxito muestra el aviso y oculta el formulario", async () => {
    forgotPassword.mockResolvedValue({ message: "ok" });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "ana@test.dev");
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(forgotPassword).toHaveBeenCalledWith({ email: "ana@test.dev" });
    expect(
      await screen.findByText(/Si esa cuenta existe, te hemos enviado un correo/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("muestra el mensaje de la API si falla con ApiError", async () => {
    forgotPassword.mockRejectedValue(new ApiError("Demasiadas solicitudes", 429));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "ana@test.dev");
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(await screen.findByText("Demasiadas solicitudes")).toBeInTheDocument();
  });

  it("muestra un mensaje genérico si el fallo no es un ApiError", async () => {
    forgotPassword.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "ana@test.dev");
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(await screen.findByText("No se pudo procesar la solicitud")).toBeInTheDocument();
  });
});
