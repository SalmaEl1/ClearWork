import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HistoryTable } from "../../src/components/HistoryTable.js";
import type { HistoryEntry } from "../../src/lib/historyEntries.js";

describe("HistoryTable", () => {
  it("muestra el estado vacío cuando no hay entradas", () => {
    render(<HistoryTable entries={[]} />);
    expect(screen.getByText("Todavía no hay nada que mostrar.")).toBeInTheDocument();
  });

  it("pinta una fila de fichaje normal con sus horas", () => {
    const entries: HistoryEntry[] = [
      {
        kind: "session",
        id: "s1",
        sortDate: "2026-03-05T09:00:00.000Z",
        session: {
          id: "s1",
          userId: "u1",
          startedAt: "2026-03-05T09:00:00.000Z",
          endedAt: "2026-03-05T17:00:00.000Z",
          workedMinutes: 480,
          breaks: [],
        },
      },
    ];
    render(<HistoryTable entries={entries} />);
    expect(screen.getByText("8h 0min")).toBeInTheDocument();
  });

  it("muestra 'En curso' cuando el fichaje no tiene hora de salida", () => {
    const entries: HistoryEntry[] = [
      {
        kind: "session",
        id: "s1",
        sortDate: "2026-03-05T09:00:00.000Z",
        session: {
          id: "s1",
          userId: "u1",
          startedAt: "2026-03-05T09:00:00.000Z",
          endedAt: null,
          workedMinutes: 120,
          breaks: [],
        },
      },
    ];
    render(<HistoryTable entries={entries} />);
    expect(screen.getByText("En curso")).toBeInTheDocument();
  });

  it("muestra la duración de una pausa ya terminada", () => {
    const entries: HistoryEntry[] = [
      {
        kind: "session",
        id: "s1",
        sortDate: "2026-03-05T09:00:00.000Z",
        session: {
          id: "s1",
          userId: "u1",
          startedAt: "2026-03-05T09:00:00.000Z",
          endedAt: "2026-03-05T17:00:00.000Z",
          workedMinutes: 450,
          breaks: [
            {
              id: "b1",
              workSessionId: "s1",
              type: "lunch",
              startedAt: "2026-03-05T13:00:00.000Z",
              endedAt: "2026-03-05T13:30:00.000Z",
            },
          ],
        },
      },
    ];
    render(<HistoryTable entries={entries} />);
    expect(screen.getByText("Pausa para comer (0h 30min)")).toBeInTheDocument();
  });

  it("muestra una pausa abierta como 'en curso'", () => {
    const entries: HistoryEntry[] = [
      {
        kind: "session",
        id: "s1",
        sortDate: "2026-03-05T09:00:00.000Z",
        session: {
          id: "s1",
          userId: "u1",
          startedAt: "2026-03-05T09:00:00.000Z",
          endedAt: null,
          workedMinutes: 240,
          breaks: [
            {
              id: "b1",
              workSessionId: "s1",
              type: "ergonomic",
              startedAt: "2026-03-05T13:00:00.000Z",
              endedAt: null,
            },
          ],
        },
      },
    ];
    render(<HistoryTable entries={entries} />);
    expect(screen.getByText("Pausa ergonómica (en curso)")).toBeInTheDocument();
  });

  it("pinta una fila de baja con su rango y etiqueta", () => {
    const entries: HistoryEntry[] = [
      { kind: "leave", id: "l1", sortDate: "2026-03-01", label: "Enfermedad", startDate: "2026-03-01", endDate: "2026-03-03" },
    ];
    render(<HistoryTable entries={entries} />);
    expect(screen.getByText("2026-03-01 – 2026-03-03")).toBeInTheDocument();
    expect(screen.getByText("Enfermedad")).toBeInTheDocument();
  });

  it("pinta una baja abierta como 'en curso'", () => {
    const entries: HistoryEntry[] = [
      { kind: "leave", id: "l1", sortDate: "2026-03-01", label: "Enfermedad", startDate: "2026-03-01", endDate: null },
    ];
    render(<HistoryTable entries={entries} />);
    expect(screen.getByText("2026-03-01 – en curso")).toBeInTheDocument();
  });

  it("pinta una fila de vacaciones", () => {
    const entries: HistoryEntry[] = [
      { kind: "vacation", id: "v1", sortDate: "2026-02-01", startDate: "2026-02-01", endDate: "2026-02-05" },
    ];
    render(<HistoryTable entries={entries} />);
    expect(screen.getByText("2026-02-01 – 2026-02-05")).toBeInTheDocument();
    expect(screen.getByText("Vacaciones")).toBeInTheDocument();
  });

  it("pinta una fila de ausencia puntual con horario y motivo", () => {
    const entries: HistoryEntry[] = [
      {
        kind: "absence",
        id: "a1",
        sortDate: "2026-03-10",
        date: "2026-03-10",
        startTime: "10:00",
        endTime: "11:00",
        reason: "Cita médica",
      },
    ];
    render(<HistoryTable entries={entries} />);
    expect(screen.getByText("2026-03-10")).toBeInTheDocument();
    expect(screen.getByText("Ausencia puntual (Cita médica)")).toBeInTheDocument();
  });
});
