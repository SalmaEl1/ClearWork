import type { CreateSeatReservationRequest, SeatAvailabilityDTO, SeatReservationDTO } from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function fetchSeatAvailability(date: string): Promise<SeatAvailabilityDTO> {
  return apiFetch<SeatAvailabilityDTO>(`/seats?date=${date}`);
}

export function reserveSeat(input: CreateSeatReservationRequest): Promise<SeatReservationDTO> {
  return apiFetch<SeatReservationDTO>("/seats", { method: "POST", body: input });
}

export function cancelSeatReservation(id: string): Promise<void> {
  return apiFetch<void>(`/seats/${id}`, { method: "DELETE" });
}
