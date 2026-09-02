import type { ScheduledAbsenceDTO } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkerAbsencesHistory } from "../../src/pages/worker/WorkerAbsencesHistory.js";

const fetchMyScheduledAbsences = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/scheduledAbsences.js", () => ({ fetchMyScheduledAbsences }));

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function absence(overrides: Partial<ScheduledAbsenceDTO> = {}): ScheduledAbsenceDTO {
  return {
    id: "a1",
    userId: "u1",
    date: isoOffset(-5),
    startTime: "10:00",
    endTime: "11:00",
    reason: "Cita médica pasada",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkerAbsencesHistory />
    </MemoryRouter>,
  );
}

describe("WorkerAbsencesHistory", () => {
  beforeEach(() => {
    fetchMyScheduledAbsences
      .mockReset()
      .mockResolvedValue([absence(), absence({ id: "a2", date: isoOffset(5), reason: "Cita futura" })]);
  });

  it("solo muestra ausencias ya pasadas", async () => {
    renderPage();
    expect(await screen.findByText("Cita médica pasada")).toBeInTheDocument();
    expect(screen.queryByText("Cita futura")).not.toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay nada pasado", async () => {
    fetchMyScheduledAbsences.mockResolvedValue([absence({ date: isoOffset(5) })]);
    renderPage();
    expect(await screen.findByText("Todavía no hay ausencias pasadas que mostrar.")).toBeInTheDocument();
  });
});
