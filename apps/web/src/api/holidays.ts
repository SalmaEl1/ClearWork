import type { CreateHolidayRequest, HolidayDTO } from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function fetchHolidays(year: number): Promise<HolidayDTO[]> {
  return apiFetch<HolidayDTO[]>(`/holidays?year=${year}`);
}

export function createHoliday(input: CreateHolidayRequest): Promise<HolidayDTO> {
  return apiFetch<HolidayDTO>("/holidays", { method: "POST", body: input });
}

export function deleteHoliday(id: string): Promise<void> {
  return apiFetch<void>(`/holidays/${id}`, { method: "DELETE" });
}
