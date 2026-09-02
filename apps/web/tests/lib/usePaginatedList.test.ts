import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePaginatedList } from "../../src/lib/usePaginatedList.js";

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

describe("usePaginatedList", () => {
  it("con la lista todavía sin cargar (null), no hay página que mostrar", () => {
    const { result } = renderHook(() => usePaginatedList<number>(null));
    expect(result.current.pageItems).toBeNull();
    expect(result.current.total).toBe(0);
  });

  it("corta la lista al tamaño de página por defecto (10)", () => {
    const { result } = renderHook(() => usePaginatedList(range(25)));
    expect(result.current.pageItems).toEqual(range(10));
    expect(result.current.total).toBe(25);
    expect(result.current.page).toBe(1);
  });

  it("avanzar de página trae el siguiente tramo", () => {
    const { result, rerender } = renderHook(({ items }) => usePaginatedList(items), {
      initialProps: { items: range(25) },
    });

    act(() => result.current.setPage(2));
    rerender({ items: range(25) });

    expect(result.current.pageItems).toEqual(range(25).slice(10, 20));
  });

  it("cambiar el tamaño de página vuelve a la página 1 con el tamaño nuevo", () => {
    const { result, rerender } = renderHook(({ items }) => usePaginatedList(items), {
      initialProps: { items: range(25) },
    });

    act(() => result.current.setPage(3));
    rerender({ items: range(25) });
    act(() => result.current.onPageSizeChange(20));
    rerender({ items: range(25) });

    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toEqual(range(20));
  });

  it("si la lista se acorta y la página actual deja de existir, recorta a la última que sí existe", () => {
    const { result, rerender } = renderHook(({ items }) => usePaginatedList(items), {
      initialProps: { items: range(25) },
    });

    act(() => result.current.setPage(3)); // página 3 de 3 (21–25)
    rerender({ items: range(25) });
    expect(result.current.page).toBe(3);

    rerender({ items: range(5) }); // ahora solo cabe 1 página
    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toEqual(range(5));
  });

  it("una recarga con los mismos datos no reinicia la página en la que se estaba", () => {
    const { result, rerender } = renderHook(({ items }) => usePaginatedList(items), {
      initialProps: { items: range(25) },
    });

    act(() => result.current.setPage(2));
    rerender({ items: range(25) });
    // Nueva referencia de array, mismo contenido: simula una recarga real.
    rerender({ items: [...range(25)] });

    expect(result.current.page).toBe(2);
  });
});
