import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSavedFlash } from "../../src/lib/useSavedFlash.js";

describe("useSavedFlash", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("empieza apagado y se enciende al llamar a flash", () => {
    const { result } = renderHook(() => useSavedFlash());
    expect(result.current[0]).toBe(false);

    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
  });

  it("se apaga solo pasada la duración por defecto (2500ms)", () => {
    const { result } = renderHook(() => useSavedFlash());

    act(() => result.current[1]());
    act(() => vi.advanceTimersByTime(2499));
    expect(result.current[0]).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current[0]).toBe(false);
  });

  it("respeta una duración personalizada", () => {
    const { result } = renderHook(() => useSavedFlash(1000));

    act(() => result.current[1]());
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current[0]).toBe(false);
  });

  it("un segundo flash reinicia la cuenta atrás", () => {
    const { result } = renderHook(() => useSavedFlash(2500));

    act(() => result.current[1]());
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current[1]());
    act(() => vi.advanceTimersByTime(2000));

    expect(result.current[0]).toBe(true);
  });

  it("limpia el temporizador al desmontar sin dejar timers colgando", () => {
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    const { result, unmount } = renderHook(() => useSavedFlash());

    act(() => result.current[1]());
    unmount();

    expect(clearSpy).toHaveBeenCalled();
  });
});
