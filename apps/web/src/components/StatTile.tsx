/** Etiqueta + cifra grande. Sin gráfico: para eso no hace falta uno. */
export function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-tile">
      <span className="stat-tile__label">{label}</span>
      <span className="stat-tile__value">{value}</span>
    </div>
  );
}
