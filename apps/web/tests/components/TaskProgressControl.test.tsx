import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { TaskProgressControl } from "../../src/components/TaskProgressControl.js";

const updateTaskProgress = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/tasks.js", () => ({ updateTaskProgress }));

describe("TaskProgressControl", () => {
  beforeEach(() => {
    updateTaskProgress.mockReset();
  });

  it("muestra el porcentaje actual en el texto y en la barra", () => {
    render(<TaskProgressControl taskId="t1" progressPercentage={40} onSaved={vi.fn()} />);

    expect(screen.getByText("Avance: 40%")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue(40);
  });

  it("el botón de guardar empieza deshabilitado (no hay cambios todavía)", () => {
    render(<TaskProgressControl taskId="t1" progressPercentage={40} onSaved={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Guardar avance" })).toBeDisabled();
  });

  it("guarda el nuevo valor y avisa a onSaved", async () => {
    const user = userEvent.setup();
    updateTaskProgress.mockResolvedValue({ id: "t1", progressPercentage: 75 });
    const onSaved = vi.fn();

    render(<TaskProgressControl taskId="t1" progressPercentage={40} onSaved={onSaved} />);

    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "75");
    await user.click(screen.getByRole("button", { name: "Guardar avance" }));

    await waitFor(() => expect(updateTaskProgress).toHaveBeenCalledWith("t1", 75));
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("muestra el mensaje de error de la API si falla el guardado", async () => {
    const user = userEvent.setup();
    updateTaskProgress.mockRejectedValue(new ApiError("No autorizado", 403));

    render(<TaskProgressControl taskId="t1" progressPercentage={40} onSaved={vi.fn()} />);

    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "60");
    await user.click(screen.getByRole("button", { name: "Guardar avance" }));

    expect(await screen.findByText("No autorizado")).toBeInTheDocument();
  });
});
