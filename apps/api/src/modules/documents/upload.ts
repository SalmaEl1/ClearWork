import { randomUUID } from "node:crypto";
import path from "node:path";
import multer from "multer";
import { DOCUMENTS_DIR, ensureDocumentsDir } from "./storage.js";

ensureDocumentsDir();

/** De sobra para una nómina o una política en PDF/Word/imagen (unas
 * pocas páginas escaneadas caben holgadamente); un tope bajo, no solo
 * "alto pero acotado", es justo lo que evita que una única subida
 * agote disco o memoria sin querer. */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DOCUMENTS_DIR),
  // Nombre aleatorio en disco (no el original): evita colisiones y no
  // expone rutas ni nombres de archivo ajenos por adivinar.
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
});

/**
 * Límites explícitos sobre la petición entera, no solo sobre el peso del
 * archivo: sin esto, multer deja sin acotar el número de campos de
 * texto y el peso de cada uno, lo que permitiría agotar memoria con una
 * petición multipart/form-data con muchísimos campos o campos enormes
 * aunque el archivo en sí respete MAX_FILE_SIZE_BYTES. El formulario
 * real (apps/web/src/api/documents.ts) manda un único archivo más dos
 * campos de texto — "label" y "recipientIds" —, de ahí files/fields.
 */
export const uploadDocument = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
    fields: 2,
    fieldSize: 1 * 1024 * 1024,
  },
}).single("file");
