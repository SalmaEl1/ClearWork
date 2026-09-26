import type { PublicUser, SeatAvailabilityDTO } from "@clearwork/shared";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { todayDateString } from "../../src/lib/dates.js";
import { WorkerSeatBooking } from "../../src/pages/worker/WorkerSeatBooking.js";

const fetchSeatAvailability = vi.hoisted(() => vi.fn());
const fetchMySeatReservations = vi.hoisted(() => vi.fn());
const reserveSeat = vi.hoisted(() => vi.fn());
const cancelSeatReservation = vi.hoisted(() => vi.fn());
const useAuth = vi.hoisted(() => vi.fn());

vi.mock("../../src/api/seats.js", () => ({
  fetchSeatAvailability,
  fetchMySeatReservations,
  reserveSeat,
  cancelSeatReservation,
}));
vi.mock("../../src/auth/AuthContext.js", () => ({ useAuth }));

const worker: PublicUser = {
  id: "u1",
  email: "worker@test.dev",
  fullName: "Juan Worker",
  role: "worker",
  weeklyTargetHours: 40,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  hireDate: "2026-01-01",
  contractType: "full_time",
};

function availability(overrides: Partial<SeatAvailabilityDTO> = {}): SeatAvailabilityDTO {
  return { date: todayDateString(), totalSeats: 5, reservations: [], ...overrides };
}

describe("WorkerSeatBooking", () => {
  beforeEach(() => {
    useAuth.mockReset().mockReturnValue({ user: worker });
    fetchSeatAvailability.mockReset().mockResolvedValue(availability());
    fetchMySeatReservations.mockReset().mockResolvedValue([]);
    reserveSeat.mockReset().mockResolvedValue({});
    cancelSeatReservation.mockReset().mockResolvedValue(undefined);
  });

  it("muestra un botón por cada asiento", async () => {
    render(<WorkerSeatBooking />);
    expect(await screen.findByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5" })).toBeInTheDocument();
  });

  it("selecciona un asiento libre y lo reserva al pulsar Reservar", async () => {
    const user = userEvent.setup();
    render(<WorkerSeatBooking />);
    const reservarButton = await screen.findByRole("button", { name: "Reservar" });
    expect(reservarButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "3" }));
    expect(reservarButton).toBeEnabled();
    expect(reserveSeat).not.toHaveBeenCalled();

    await user.click(reservarButton);

    await waitFor(() =>
      expect(reserveSeat).toHaveBeenCalledWith({ date: todayDateString(), seatNumber: 3 }),
    );
  });

  it("no deja reservar un asiento ya ocupado por otra persona", async () => {
    fetchSeatAvailability.mockResolvedValue(
      availability({
        reservations: [{ id: "r1", userId: "u2", userFullName: "Otra persona", date: todayDateString(), seatNumber: 2 }],
      }),
    );
    render(<WorkerSeatBooking />);
    const seat2 = await screen.findByRole("button", { name: "2" });
    expect(seat2).toBeDisabled();
    expect(seat2).toHaveAttribute("title", "Otra persona");
  });

  it("cancela la propia reserva tras confirmar", async () => {
    fetchSeatAvailability.mockResolvedValue(
      availability({
        reservations: [{ id: "r1", userId: "u1", userFullName: "Juan Worker", date: todayDateString(), seatNumber: 4 }],
      }),
    );
    const user = userEvent.setup();
    render(<WorkerSeatBooking />);

    await user.click(await screen.findByRole("button", { name: "4" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancelar reserva" }));

    await waitFor(() => expect(cancelSeatReservation).toHaveBeenCalledWith("r1"));
  });

  it("lista las reservas del mes en curso", async () => {
    fetchMySeatReservations.mockResolvedValue([
      { id: "r9", userId: "u1", userFullName: "Juan Worker", date: todayDateString(), seatNumber: 7 },
    ]);
    render(<WorkerSeatBooking />);

    expect(await screen.findByText(todayDateString())).toBeInTheDocument();
    expect(screen.getByText("Asiento 7")).toBeInTheDocument();
  });
});
