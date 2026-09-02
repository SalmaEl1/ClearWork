import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useStoredViewMode } from "../../src/lib/useStoredViewMode.js";

afterEach(() => {
  localStorage.clear();
});

describe("useStoredViewMode", () => {
  it("empieza en el valor por defecto cuando no hay nada guardado", () => {
    const { result } = renderHook(() => useStoredViewMode("test-key", ["list", "board"], "list"));
    expect(result.current[0]).toBe("list");
  });

  it("cambiar el valor lo guarda en localStorage", () => {
    const { result } = renderHook(() => useStoredViewMode("test-key", ["list", "board"], "list"));

    act(() => result.current[1]("board"));

    expect(result.current[0]).toBe("board");
    expect(localStorage.getItem("test-key")).toBe("board");
  });

  it("una nueva instancia recupera el valor ya guardado", () => {
    const first = renderHook(() => useStoredViewMode("test-key", ["list", "board"], "list"));
    act(() => first.result.current[1]("board"));

    const second = renderHook(() => useStoredViewMode("test-key", ["list", "board"], "list"));
    expect(second.result.current[0]).toBe("board");
  });

  it("ignora un valor guardado que ya no es una opción válida", () => {
    localStorage.setItem("test-key", "trainings"); // vista antigua ya retirada
    const { result } = renderHook(() => useStoredViewMode("test-key", ["list", "board"], "list"));
    expect(result.current[0]).toBe("list");
  });

  it("dos claves distintas no se pisan entre sí", () => {
    const worker = renderHook(() => useStoredViewMode("worker-key", ["list", "board"], "list"));
    const supervisor = renderHook(() => useStoredViewMode("supervisor-key", ["list", "board"], "list"));

    act(() => worker.result.current[1]("board"));

    expect(worker.result.current[0]).toBe("board");
    expect(supervisor.result.current[0]).toBe("list");
  });
});
