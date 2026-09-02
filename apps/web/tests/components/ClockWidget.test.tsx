import type { ActiveSessionResponse, WorkSessionDTO } from "@clearwork/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClockWidget } from "../../src/components/ClockWidget.js";

const fetchActiveSession = vi.hoisted(() => vi.fn());
const clockIn = vi.hoisted(() => vi.fn());
const clockOut = vi.hoisted(() => vi.fn());
const startBreak = vi.hoisted(() => vi.fn());
const endBreak = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/workSessions.js", () => ({
  fetchActiveSession,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
}));

function session(overrides: Partial<WorkSessionDTO> = {}): WorkSessionDTO {
  return {
    id: "s1",
    userId: "u1",
    startedAt: "2026-01-01T09:00:00.000Z",
    endedAt: null,
    workedMinutes: 30,
    breaks: [],
    ...overrides,
  };
}

function noActiveSession(): ActiveSessionResponse {
  return { activeSession: null };
}

describe("ClockWidget", () => {
  beforeEach(() => {
    fetchActiveSession.mockReset().mockResolvedValue(noActiveSession());
    clockIn.mockReset().mockResolvedValue(session());
    clockOut.mockReset().mockResolvedValue(session({ endedAt: "2026-01-01T17:00:00.000Z" }));
    startBreak.mockReset().mockResolvedValue(session());
    endBreak.mockReset().mockResolvedValue(session());
  });

  it("antes de fichar entrada, ofrece fichar entrada", async () => {
    render(<ClockWidget />);
    expect(await screen.findByText("No has fichado entrada todavía.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fichar entrada" })).toBeInTheDocument();
  });

  it("ficha entrada", async () => {
    const user = userEvent.setup();
    render(<ClockWidget />);
    await screen.findByText("No has fichado entrada todavía.");

    await user.click(screen.getByRole("button", { name: "Fichar entrada" }));

    await waitFor(() => expect(clockIn).toHaveBeenCalled());
  });

  it("muestra la jornada en curso con acciones de pausa y salida", async () => {
    fetchActiveSession.mockResolvedValue({ activeSession: session() });
    render(<ClockWidget />);
    expect(await screen.findByText(/Trabajando desde las/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fichar salida" })).toBeInTheDocument();
  });

  it("ficha salida normalmente", async () => {
    const user = userEvent.setup();
    fetchActiveSession.mockResolvedValue({ activeSession: session() });
    render(<ClockWidget />);
    await screen.findByText(/Trabajando desde las/);

    await user.click(screen.getByRole("button", { name: "Fichar salida" }));

    await waitFor(() => expect(clockOut).toHaveBeenCalled());
  });

  it("inicia y termina una pausa", async () => {
    const user = userEvent.setup();
    fetchActiveSession.mockResolvedValue({ activeSession: session() });
    render(<ClockWidget />);
    await screen.findByText(/Trabajando desde las/);

    await user.click(screen.getByRole("button", { name: "Pausa para comer" }));
    await waitFor(() => expect(startBreak).toHaveBeenCalledWith("lunch"));
  });
});
