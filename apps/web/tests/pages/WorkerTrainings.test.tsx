import type { MyTrainingAssignmentDTO } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkerTrainings } from "../../src/pages/worker/WorkerTrainings.js";

const fetchMyTrainingAssignments = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/trainingAssignments.js", () => ({ fetchMyTrainingAssignments }));

function assignment(overrides: Partial<MyTrainingAssignmentDTO> = {}): MyTrainingAssignmentDTO {
  return {
    id: "a1",
    trainingId: "t1",
    userId: "u1",
    trainingTitle: "Prevención de riesgos",
    assignedBy: "s1",
    assignedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("WorkerTrainings", () => {
  beforeEach(() => {
    fetchMyTrainingAssignments.mockReset().mockResolvedValue([assignment()]);
  });

  it("lista las formaciones asignadas", async () => {
    render(<WorkerTrainings />);
    expect(await screen.findByText("Prevención de riesgos")).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay formaciones asignadas", async () => {
    fetchMyTrainingAssignments.mockResolvedValue([]);
    render(<WorkerTrainings />);
    expect(await screen.findByText("Todavía no tienes formaciones asignadas.")).toBeInTheDocument();
  });
});
