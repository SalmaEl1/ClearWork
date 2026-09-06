import { afterEach, describe, expect, it, vi } from "vitest";
import { todayDateString } from "../../src/lib/dates.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("todayDateString", () => {
  it("devuelve la fecha local de hoy como AAAA-MM-DD con ceros a la izquierda", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 10, 30)); // 5 de enero de 2026, hora local
    expect(todayDateString()).toBe("2026-01-05");
  });

  it("usa dos dígitos también para meses y días de dos cifras", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 23, 23, 59));
    expect(todayDateString()).toBe("2026-11-23");
  });

  it("coincide con una comparación directa contra el valor de un <input type=\"date\">", () => {
    const value = todayDateString();
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
