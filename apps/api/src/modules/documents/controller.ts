import type { NextFunction, Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../shared/errors.js";
import type { AuthUser } from "../auth/jwt.js";
import { createDocumentSchema } from "./schemas.js";
import { documentFilePath } from "./storage.js";
import * as service from "./service.js";

function requireUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export async function createDocumentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    if (!req.file) throw new BadRequestError("Falta el archivo a compartir");

    const input = createDocumentSchema.parse(req.body);
    const document = await service.createDocument(user.id, user.role, req.file, input);
    res.status(201).json(document);
  } catch (err) {
    next(err);
  }
}

export async function listMyDocumentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const documents = await service.listMyDocuments(user.id);
    res.status(200).json(documents);
  } catch (err) {
    next(err);
  }
}

export async function listSentDocumentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const documents = await service.listSentDocuments(user.id, user.role);
    res.status(200).json(documents);
  } catch (err) {
    next(err);
  }
}

export async function downloadDocumentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const document = await service.getDocumentForDownload(user.id, user.role, req.params.id as string);
    res.download(documentFilePath(document.stored_name), document.original_name);
  } catch (err) {
    next(err);
  }
}

export async function deleteDocumentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    await service.deleteDocument(user.id, user.role, req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
