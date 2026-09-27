import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "../../src/components/Modal.js";

describe("Modal", () => {
  it("muestra el título y el contenido recibido", () => {
    render(
      <Modal title="Nueva tarea" onClose={vi.fn()}>
        <p>Contenido del formulario</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog", { name: "Nueva tarea" })).toBeInTheDocument();
    expect(screen.getByText("Contenido del formulario")).toBeInTheDocument();
  });

  it("llama a onClose al pulsar el botón de cerrar", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal title="Nueva tarea" onClose={onClose}>
        <p>Contenido</p>
      </Modal>,
    );

    await user.click(screen.getByText("×"));

    expect(onClose).toHaveBeenCalled();
  });

  it("llama a onClose al pulsar fuera del modal (overlay)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <Modal title="Nueva tarea" onClose={onClose}>
        <p>Contenido</p>
      </Modal>,
    );

    const backdrop = container.querySelector(".modal-overlay__backdrop");
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as Element);

    expect(onClose).toHaveBeenCalled();
  });

  it("llama a onClose al pulsar Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal title="Nueva tarea" onClose={onClose}>
        <p>Contenido</p>
      </Modal>,
    );

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });

  it("no llama a onClose al pulsar otra tecla", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal title="Nueva tarea" onClose={onClose}>
        <p>Contenido</p>
      </Modal>,
    );

    await user.keyboard("{Enter}");

    expect(onClose).not.toHaveBeenCalled();
  });
});
