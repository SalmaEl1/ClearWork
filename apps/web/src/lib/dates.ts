/** Fecha de hoy en formato AAAA-MM-DD (huso horario local del
 * navegador), para comparar directamente con el valor de un
 * <input type="date"> sin tener que parsear cadenas a Date. */
export function todayDateString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
