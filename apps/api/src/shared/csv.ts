/**
 * Serialización CSV mínima (RFC 4180): un campo se envuelve entre
 * comillas dobles solo si contiene una coma, una comilla o un salto de
 * línea, duplicando las comillas que ya tuviera dentro. No hace falta
 * ninguna librería para esto — es una regla de tres líneas.
 */
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(","));
  // \r\n: es lo que espera Excel para separar filas sin desconfigurar
  // el "abrir con" en Windows.
  return lines.join("\r\n") + "\r\n";
}
