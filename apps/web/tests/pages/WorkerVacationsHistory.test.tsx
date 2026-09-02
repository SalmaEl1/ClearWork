import type { VacationRequestDTO } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkerVacationsHistory } from "../../src/pages/worker/WorkerVacationsHistory.js";

const fetchMyVacationRequests = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/vacations.js", () => ({ fetchMyVacationRequests }));

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function request(overrides: Partial<VacationRequestDTO> = {}): VacationRequestDTO {
  return {
    id: "v1",
    userId: "u1",
    startDate: isoOffset(-10),
    endDate: isoOffset(-10),
    status: "approved",
    decidedBy: "s1",
    decidedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkerVacationsHistory />
    </MemoryRouter>,
  );
}

describe("WorkerVacationsHistory", () => {
  beforeEach(() => {
    fetchMyVacationRequests.mockReset().mockResolvedValue([request(), request({ id: "v2", startDate: isoOffset(10), endDate: isoOffset(10) })]);
  });

  it("solo muestra solicitudes ya pasadas", async () => {
    renderPage();
    expect(await screen.findByText(isoOffset(-10))).toBeInTheDocument();
    expect(screen.queryByText(isoOffset(10))).not.toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay nada pasado", async () => {
    fetchMyVacationRequests.mockResolvedValue([request({ startDate: isoOffset(10), endDate: isoOffset(10) })]);
    renderPage();
    expect(await screen.findByText("Todavía no hay vacaciones pasadas que mostrar.")).toBeInTheDocument();
  });
});
