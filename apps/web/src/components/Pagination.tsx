/**
 * Controles "Anterior / Página X de Y / Siguiente" para una lista
 * paginada en servidor. No se muestra nada si todo cabe en una página,
 * para no añadir ruido visual cuando no hace falta.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
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
  );
}
