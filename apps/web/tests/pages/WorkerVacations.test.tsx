import type { VacationBalanceDTO, VacationRequestDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { WorkerVacations } from "../../src/pages/worker/WorkerVacations.js";

const createVacationRequest = vi.hoisted(() => vi.fn());
const fetchMyVacationRequests = vi.hoisted(() => vi.fn());
const cancelVacationRequest = vi.hoisted(() => vi.fn());
const fetchMyVacationBalance = vi.hoisted(() => vi.fn());
const fetchVacationRules = vi.hoisted(() => vi.fn());
const fetchHolidays = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/vacations.js", () => ({
  createVacationRequest,
  fetchMyVacationRequests,
  cancelVacationRequest,
  fetchMyVacationBalance,
  fetchVacationRules,
}));
vi.mock("../../src/api/holidays.js", () => ({ fetchHolidays }));

function balance(overrides: Partial<VacationBalanceDTO> = {}): VacationBalanceDTO {
  return { year: 2026, total: 23, used: 5, remaining: 18, ...overrides };
}

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
    fetchMyVacationBalance.mockReset().mockResolvedValue(balance());
    // Sin festivos y sin excluir findes por defecto en estos tests: así
    // "hoy" siempre se puede elegir en el calendario, sea cual sea el
    // día de la semana real en que corra la suite.
    fetchVacationRules.mockReset().mockResolvedValue({ excludeWeekendsFromVacationDays: false });
    fetchHolidays.mockReset().mockResolvedValue([]);
  });

  it("muestra los días de vacaciones que quedan", async () => {
    fetchMyVacationBalance.mockResolvedValue(balance({ remaining: 7, total: 23 }));
    renderPage();
    expect(await screen.findByText(/Te quedan/)).toHaveTextContent("Te quedan 7 de 23 días.");
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

  it("no deja elegir un día marcado como festivo", async () => {
    const today = new Date();
    const todayIso = isoOffset(0);
    fetchHolidays.mockResolvedValue([{ id: null, date: todayIso, label: "Festivo de prueba", isNational: true }]);
    renderPage();
    await screen.findByText(isoOffset(10));

    const dayButton = await screen.findByRole("button", { name: String(today.getDate()) });
    expect(dayButton).toBeDisabled();
  });

  it("enlaza al historial de vacaciones", async () => {
    renderPage();
    await screen.findByText(isoOffset(10));
    expect(screen.getByRole("link", { name: "Ver historial →" })).toHaveAttribute(
      "href",
      "/worker/vacations/history",
    );
  });

  it("deseleccionar un día ya elegido lo quita de la lista", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(isoOffset(10));

    const now = new Date();
    const dayButton = screen.getByRole("button", { name: String(now.getDate()) });
    await user.click(dayButton);
    expect(await screen.findByText(/día\(s\) elegido\(s\)/)).toBeInTheDocument();

    await user.click(dayButton);
    expect(screen.getByText("Elige uno o varios días del año en curso.")).toBeInTheDocument();
  });

  it("muestra el mensaje de un ApiError si falla enviar la solicitud de vacaciones", async () => {
    const user = userEvent.setup();
    createVacationRequest.mockRejectedValue(new ApiError("Ya tienes vacaciones ese día", 409));
    renderPage();
    await screen.findByText(isoOffset(10));

    const now = new Date();
    await user.click(screen.getByRole("button", { name: String(now.getDate()) }));
    await user.click(screen.getByRole("button", { name: "Solicitar" }));

    expect(await screen.findByText("Ya tienes vacaciones ese día")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error al enviar la solicitud no es un ApiError", async () => {
    const user = userEvent.setup();
    createVacationRequest.mockRejectedValue(new Error("boom"));
    renderPage();
    await screen.findByText(isoOffset(10));

    const now = new Date();
    await user.click(screen.getByRole("button", { name: String(now.getDate()) }));
    await user.click(screen.getByRole("button", { name: "Solicitar" }));

    expect(await screen.findByText("No se pudo enviar la solicitud")).toBeInTheDocument();
  });

  it("muestra el mensaje de un ApiError si falla la carga de solicitudes", async () => {
    fetchMyVacationRequests.mockRejectedValue(new ApiError("No autorizado", 403));
    renderPage();
    expect(await screen.findByText("No autorizado")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error de carga de solicitudes no es un ApiError", async () => {
    fetchMyVacationRequests.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByText("No se pudieron cargar las solicitudes")).toBeInTheDocument();
  });

  it("no muestra la tarjeta de saldo si falla su carga, pero el resto sigue funcionando", async () => {
    fetchMyVacationBalance.mockRejectedValue(new Error("boom"));
    renderPage();
    await screen.findByText(isoOffset(10));
    expect(screen.queryByText(/Saldo de vacaciones/)).not.toBeInTheDocument();
  });

  it("muestra el mensaje de un ApiError si falla cancelar una solicitud", async () => {
    const user = userEvent.setup();
    cancelVacationRequest.mockRejectedValue(new ApiError("No se puede cancelar ya en curso", 409));
    renderPage();
    await screen.findByText(isoOffset(10));

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByText("No se puede cancelar ya en curso")).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error al cancelar no es un ApiError", async () => {
    const user = userEvent.setup();
    cancelVacationRequest.mockRejectedValue(new Error("boom"));
    renderPage();
    await screen.findByText(isoOffset(10));

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByText("No se pudo cancelar")).toBeInTheDocument();
  });

  it("muestra un mensaje cuando no hay solicitudes próximas", async () => {
    fetchMyVacationRequests.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("No tienes vacaciones solicitadas próximamente.")).toBeInTheDocument();
  });

  it("muestra el rango de una solicitud de varios días", async () => {
    fetchMyVacationRequests.mockResolvedValue([request({ startDate: isoOffset(10), endDate: isoOffset(15) })]);
    renderPage();
    expect(await screen.findByText(`${isoOffset(10)} – ${isoOffset(15)}`)).toBeInTheDocument();
  });
});
