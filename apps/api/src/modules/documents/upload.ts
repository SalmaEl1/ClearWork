import { randomUUID } from "node:crypto";
import path from "node:path";
import multer from "multer";
import { DOCUMENTS_DIR, ensureDocumentsDir } from "./storage.js";

ensureDocumentsDir();

/** De sobra para una nómina o una política en PDF/Word/imagen; evita que
 * un archivo enorme agote disco o memoria sin querer. */
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DOCUMENTS_DIR),
  // Nombre aleatorio en disco (no el original): evita colisiones y no
  // expone rutas ni nombres de archivo ajenos por adivinar.
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
});

/** Middleware de subida para POST /api/documents: un único archivo en el
 * campo "file" del multipart/form-data. */
export const uploadDocument = multer({ storage, limits: { fileSize: MAX_FILE_SIZE_BYTES } }).single("file");
