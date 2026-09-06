import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Los archivos se guardan en disco, no en la base de datos (solo su
 * metadato — ver repository.ts): más simple que gestionar un bucket
 * externo, suficiente para el alcance de este TFG. Fuera del control de
 * versiones (ver .gitignore). */
export const DOCUMENTS_DIR = path.resolve(__dirname, "../../../uploads/documents");

export function ensureDocumentsDir(): void {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

export function documentFilePath(storedName: string): string {
  return path.join(DOCUMENTS_DIR, storedName);
}

/** Best-effort: si el archivo ya no está (o nunca llegó a escribirse
 * del todo), no debe impedir borrar el registro de todos modos. */
export function deleteDocumentFile(storedName: string): void {
  try {
    fs.unlinkSync(documentFilePath(storedName));
  } catch {
    // ver comentario de arriba
  }
}
