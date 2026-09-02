import { useEffect, useState } from "react";

const DEFAULT_PAGE_SIZE = 10;

/**
 * Paginación en cliente para una lista que ya se trae entera del
 * servidor (issue #96): pensada para historiales que crecen con el
 * tiempo (fichaje, vacaciones, ausencias) pero que hoy no tienen un
 * endpoint paginado propio — a diferencia de usuarios, proyectos, tareas
 * o actividad, que si lo tienen (ver Pagination.tsx). Mismo componente
 * <Pagination> y mismo comportamiento visible; solo cambia dónde se
 * corta la lista.
 */
export function usePaginatedList<T>(items: T[] | null, defaultPageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Solo recorta hacia abajo si la página en la que se estaba ha dejado
  // de existir (la lista se acortó, o se eligió un tamaño mayor) — nunca
  // vuelve a la 1 solo porque haya llegado una recarga con datos nuevos,
  // que dejaría la vista saltando a la primera página en cada refresco.
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil((items?.length ?? 0) / pageSize));
    setPage((p) => Math.min(p, totalPages));
  }, [items, pageSize]);

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  const total = items?.length ?? 0;
  const start = (page - 1) * pageSize;
  const pageItems = items?.slice(start, start + pageSize) ?? null;

  return { page, pageSize, total, pageItems, setPage, onPageSizeChange: handlePageSizeChange };
}
