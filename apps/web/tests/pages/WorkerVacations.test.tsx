import type { VacationRequestDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkerVacations } from "../../src/pages/worker/WorkerVacations.js";

const createVacationRequest = vi.hoisted(() => vi.fn());
const fetchMyVacationRequests = vi.hoisted(() => vi.fn());
const cancelVacationRequest = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/vacations.js", () => ({
  createVacationRequest,
  fetchMyVacationRequests,
  cancelVacationRequest,
}));

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function request(overrides: Partial<VacationRequestDTO> = {}): VacationRequestDTO {
  const day = isoOffset(10);
  return {
    id: "v1",
    userId: "u1",
    startDate: day,
    endDate: day,
    status: "pending",
    decidedBy: null,
    decidedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkerVacations />
    </MemoryRouter>,
  );
}

describe("WorkerVacations", () => {
  beforeEach(() => {
    fetchMyVacationRequests.mockReset().mockResolvedValue([request()]);
    createVacationRequest.mockReset().mockResolvedValue(request());
    cancelVacationRequest.mockReset().mockResolvedValue(request({ status: "cancelled" }));
  });

  it("lista las solicitudes próximas con su estado", async () => {
    renderPage();
    expect(await screen.findByText(isoOffset(10))).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("solo ofrece cancelar cuando la solicitud está pendiente", async () => {
    fetchMyVacationRequests.mockResolvedValue([request({ status: "approved" })]);
    renderPage();
    await screen.findByText("Aprobada");
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });

  it("solicita vacaciones para el día de hoy elegido en el calendario", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(isoOffset(10));

    const now = new Date();
    await user.click(screen.getByRole("button", { name: String(now.getDate()) }));
    await user.click(screen.getByRole("button", { name: "Solicitar" }));

    const today = isoOffset(0);
    await waitFor(() =>
      expect(createVacationRequest).toHaveBeenCalledWith({ startDate: today, endDate: today }),
    );
  });

  it("cancela una solicitud pendiente", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(isoOffset(10));

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(cancelVacationRequest).toHaveBeenCalledWith("v1"));
  });

  it("enlaza al historial de vacaciones", async () => {
    renderPage();
    await screen.findByText(isoOffset(10));
    expect(screen.getByRole("link", { name: "Ver historial →" })).toHaveAttribute(
      "href",
      "/worker/vacations/history",
    );
  });
});
