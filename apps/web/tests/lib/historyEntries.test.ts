import type { LeaveDTO, ScheduledAbsenceDTO, VacationRequestDTO, WorkSessionDTO } from "@clearwork/shared";
import { describe, expect, it } from "vitest";
import { buildHistoryEntries } from "../../src/lib/historyEntries.js";

function session(overrides: Partial<WorkSessionDTO> = {}): WorkSessionDTO {
  return {
    id: "s1",
    userId: "u1",
    startedAt: "2026-03-05T09:00:00.000Z",
    endedAt: "2026-03-05T17:00:00.000Z",
    workedMinutes: 480,
    breaks: [],
    ...overrides,
  };
}

function leave(overrides: Partial<LeaveDTO> = {}): LeaveDTO {
  return {
    id: "l1",
    userId: "u1",
    type: "sick_leave",
    startDate: "2026-03-01",
    endDate: "2026-03-03",
    createdBy: "admin1",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function vacation(overrides: Partial<VacationRequestDTO> = {}): VacationRequestDTO {
  return {
    id: "v1",
    userId: "u1",
    startDate: "2026-02-01",
    endDate: "2026-02-05",
    status: "approved",
    decidedBy: "sup1",
    decidedAt: "2026-01-15T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function absence(overrides: Partial<ScheduledAbsenceDTO> = {}): ScheduledAbsenceDTO {
  return {
    id: "a1",
    userId: "u1",
    date: "2026-03-10",
    startTime: "10:00",
    endTime: "11:00",
    reason: "Cita médica",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildHistoryEntries", () => {
  it("junta sesiones, bajas, vacaciones aprobadas y ausencias en una sola lista", () => {
    const entries = buildHistoryEntries([session()], [leave()], [vacation()], [absence()]);
    expect(entries.map((e) => e.kind).sort()).toEqual(["absence", "leave", "session", "vacation"]);
  });

  it("descarta las vacaciones no aprobadas", () => {
    const entries = buildHistoryEntries([], [], [vacation({ status: "pending" })], []);
    expect(entries).toHaveLength(0);
  });

  it("ordena de más reciente a más antigua, mezclando fechas y datetimes", () => {
    const entries = buildHistoryEntries(
      [session({ startedAt: "2026-03-15T09:00:00.000Z" })],
      [leave({ startDate: "2026-03-01", endDate: "2026-03-03" })],
      [vacation({ startDate: "2026-02-01", endDate: "2026-02-05" })],
      [absence({ date: "2026-03-20" })],
    );
    expect(entries.map((e) => e.kind)).toEqual(["absence", "session", "leave", "vacation"]);
  });

  it("una baja sin fecha de fin se conserva con endDate null", () => {
    const entries = buildHistoryEntries([], [leave({ endDate: null })], [], []);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ kind: "leave", endDate: null });
  });
});
