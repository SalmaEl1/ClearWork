import type { TrainingDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminTrainings } from "../../src/pages/admin/AdminTrainings.js";

const fetchTrainings = vi.hoisted(() => vi.fn());
const createTraining = vi.hoisted(() => vi.fn());
const deleteTraining = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/trainings.js", () => ({ fetchTrainings, createTraining, deleteTraining }));

function training(overrides: Partial<TrainingDTO> = {}): TrainingDTO {
  return { id: "t1", title: "Prevención de riesgos", createdAt: "2026-01-01T00:00:00.000Z", ...overrides };
}

describe("AdminTrainings", () => {
  beforeEach(() => {
    fetchTrainings.mockReset().mockResolvedValue([training()]);
    createTraining.mockReset().mockResolvedValue(training());
    deleteTraining.mockReset().mockResolvedValue(undefined);
  });

  it("lista el catálogo", async () => {
    render(<AdminTrainings />);
    expect(await screen.findByText("Prevención de riesgos")).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay formaciones", async () => {
    fetchTrainings.mockResolvedValue([]);
    render(<AdminTrainings />);
    expect(await screen.findByText("Todavía no hay formaciones en el catálogo.")).toBeInTheDocument();
  });

  it("crea una nueva formación", async () => {
    const user = userEvent.setup();
    render(<AdminTrainings />);
    await screen.findByText("Prevención de riesgos");

    await user.type(screen.getByPlaceholderText("Título de la formación"), "Atención al cliente");
    await user.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => expect(createTraining).toHaveBeenCalledWith({ title: "Atención al cliente" }));
  });

  it("elimina una formación", async () => {
    const user = userEvent.setup();
    render(<AdminTrainings />);
    await screen.findByText("Prevención de riesgos");

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(deleteTraining).toHaveBeenCalledWith("t1"));
  });
});
