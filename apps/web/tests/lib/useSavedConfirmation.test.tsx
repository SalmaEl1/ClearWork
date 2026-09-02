import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSavedConfirmation } from "../../src/lib/useSavedConfirmation.js";

describe("useSavedConfirmation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("empieza en false y se pone en true al llamar a trigger", () => {
    const { result } = renderHook(() => useSavedConfirmation(2500));
    expect(result.current[0]).toBe(false);

    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
  });

  it("vuelve a false por sí solo pasada la duración indicada", () => {
    const { result } = renderHook(() => useSavedConfirmation(2500));

    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);

    act(() => vi.advanceTimersByTime(2500));
    expect(result.current[0]).toBe(false);
  });

  it("un segundo trigger reinicia la cuenta atrás en vez de acumularse", () => {
    const { result } = renderHook(() => useSavedConfirmation(2500));

    act(() => result.current[1]());
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current[1]());
    act(() => vi.advanceTimersByTime(2000));

    // Han pasado 4000ms desde el primer trigger, pero solo 2000 desde el
    // segundo: si no reiniciara el temporizador, ya se habría apagado.
    expect(result.current[0]).toBe(true);
  });
});
