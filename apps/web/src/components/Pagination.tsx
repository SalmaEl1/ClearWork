const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Controles de una lista paginada en servidor: selector de "elementos
 * por página" a un lado, "Anterior / Página X de Y / Siguiente" al otro,
 * siempre al final de la lista (issue #96, mismo patrón en toda la app).
 * Se oculta entera solo si no hay ningún elemento — el estado vacío ya lo
 * dice la propia vista — porque el selector sigue siendo útil aunque
 * quepa todo en una página.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // La propia página actual entra siempre en la lista de opciones, aunque
  // no sea una de las habituales (p. ej. un valor que ya venía de antes).
  const options = pageSizeOptions.includes(pageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, pageSize].sort((a, b) => a - b);

  return (
    <div className="pagination">
      <label className="pagination__size">
        <span>Mostrar</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label="Elementos por página"
        >
          {options.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>por página</span>
      </label>
      <div className="pagination__nav">
        <button
          type="button"
          className="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ← Anterior
        </button>
        <span className="pagination__status">
          Página {page} de {totalPages} · {total} en total
        </span>
        <button
          type="button"
          className="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
