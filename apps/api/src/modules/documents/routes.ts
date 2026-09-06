import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  createDocumentHandler,
  deleteDocumentHandler,
  downloadDocumentHandler,
  listMyDocumentsHandler,
  listSentDocumentsHandler,
} from "./controller.js";
import { uploadDocument } from "./upload.js";

/** Compartir (subir), ver lo compartido y eliminar es cosa de admin y
 * supervisor; el trabajador solo ve lo que le han compartido a él. La
 * descarga está abierta a cualquier rol autenticado — el servicio
 * decide si esa persona en concreto puede descargar ESE documento. */
export const documentsRouter = Router();

documentsRouter.use(authenticate);

documentsRouter.post("/", authorize("admin", "supervisor"), uploadDocument, createDocumentHandler);
documentsRouter.get("/mine", authorize("worker"), listMyDocumentsHandler);
documentsRouter.get("/sent", authorize("admin", "supervisor"), listSentDocumentsHandler);
documentsRouter.get("/:id/download", downloadDocumentHandler);
documentsRouter.delete("/:id", authorize("admin", "supervisor"), deleteDocumentHandler);
