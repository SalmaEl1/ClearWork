import type { DocumentDTO, Role, SentDocumentDTO } from "@clearwork/shared";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../shared/errors.js";
import { notify } from "../../shared/notifications.js";
import { listActiveWorkersForSupervisor } from "../projects/repository.js";
import { findUserById, findUsersByIds } from "../users/repository.js";
import { deleteDocumentFile } from "./storage.js";
import * as repo from "./repository.js";
import type { DocumentRow } from "./repository.js";

function toDTO(row: DocumentRow, uploaderName: string): DocumentDTO {
  return {
    id: row.id,
    label: row.label,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    uploaderName,
    createdAt: row.created_at.toISOString(),
  };
}

export type UploadedFile = {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
};

/**
 * Un admin puede compartir con cualquier trabajador; un supervisor,
 * solo con quien esté hoy en su propio equipo (mismo criterio que
 * leaves/service.ts). "De forma colectiva" o "individual" es, para el
 * modelo de datos, la misma lista de destinatarios con uno o varios ids.
 */
export async function createDocument(
  actorId: string,
  actorRole: Role,
  file: UploadedFile,
  input: { label: string; recipientIds: string[] },
): Promise<SentDocumentDTO> {
  const uploader = await findUserById(actorId);
  if (!uploader) throw new NotFoundError("Usuario no encontrado");

  const uniqueRecipientIds = [...new Set(input.recipientIds)];
  const recipients = await findUsersByIds(uniqueRecipientIds);
  if (recipients.length !== uniqueRecipientIds.length || recipients.some((r) => r.role !== "worker")) {
    throw new BadRequestError("Todos los destinatarios deben ser trabajadores existentes");
  }

  if (actorRole === "supervisor") {
    const team = await listActiveWorkersForSupervisor(actorId);
    const teamIds = new Set(team.map((w) => w.id));
    if (recipients.some((r) => !teamIds.has(r.id))) {
      throw new ForbiddenError("Solo puedes compartir documentos con trabajadores de tu propio equipo");
    }
  }

  const document = await repo.insertDocument({
    label: input.label,
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    uploadedBy: actorId,
  });
  await repo.insertRecipients(document.id, uniqueRecipientIds);

  for (const recipient of recipients) {
    await notify(recipient.id, {
      type: "document_shared",
      documentId: document.id,
      label: document.label,
      uploaderName: uploader.full_name,
    });
  }

  return {
    ...toDTO(document, uploader.full_name),
    recipients: recipients.map((r) => ({ userId: r.id, fullName: r.full_name })),
  };
}

export async function listMyDocuments(workerId: string): Promise<DocumentDTO[]> {
  const rows = await repo.listDocumentsForRecipient(workerId);
  if (rows.length === 0) return [];

  const uploaders = await findUsersByIds([...new Set(rows.map((r) => r.uploaded_by))]);
  const nameById = new Map(uploaders.map((u) => [u.id, u.full_name]));

  return rows.map((row) => toDTO(row, nameById.get(row.uploaded_by) ?? ""));
}

export async function listSentDocuments(actorId: string, actorRole: Role): Promise<SentDocumentDTO[]> {
  const rows =
    actorRole === "admin" ? await repo.listAllDocuments() : await repo.listDocumentsUploadedBy(actorId);
  if (rows.length === 0) return [];

  const recipientLinks = await repo.listRecipientsForDocuments(rows.map((r) => r.id));
  const uploaderIds = rows.map((r) => r.uploaded_by);
  const recipientUserIds = recipientLinks.map((l) => l.user_id);
  const users = await findUsersByIds([...new Set([...uploaderIds, ...recipientUserIds])]);
  const nameById = new Map(users.map((u) => [u.id, u.full_name]));

  const recipientsByDocument = new Map<string, { userId: string; fullName: string }[]>();
  for (const link of recipientLinks) {
    const list = recipientsByDocument.get(link.document_id) ?? [];
    list.push({ userId: link.user_id, fullName: nameById.get(link.user_id) ?? "" });
    recipientsByDocument.set(link.document_id, list);
  }

  return rows.map((row) => ({
    ...toDTO(row, nameById.get(row.uploaded_by) ?? ""),
    recipients: recipientsByDocument.get(row.id) ?? [],
  }));
}

/** Quien subió el documento y cualquier admin lo pueden descargar
 * siempre; cualquier otra persona, solo si está entre los destinatarios.
 * 404 (no 403) si no: no confirma que el documento exista a quien no
 * tiene por qué saberlo. */
export async function getDocumentForDownload(
  actorId: string,
  actorRole: Role,
  documentId: string,
): Promise<DocumentRow> {
  const document = await repo.findDocumentById(documentId);
  if (!document) throw new NotFoundError("Documento no encontrado");

  if (actorRole === "admin" || document.uploaded_by === actorId) return document;

  if (!(await repo.isRecipient(documentId, actorId))) {
    throw new NotFoundError("Documento no encontrado");
  }
  return document;
}

export async function deleteDocument(actorId: string, actorRole: Role, documentId: string): Promise<void> {
  const document = await repo.findDocumentById(documentId);
  if (!document) throw new NotFoundError("Documento no encontrado");

  if (actorRole !== "admin" && document.uploaded_by !== actorId) {
    throw new ForbiddenError("Solo quien lo compartió, o un admin, puede eliminar este documento");
  }

  await repo.deleteDocumentById(documentId);
  deleteDocumentFile(document.stored_name);
}
