import { pool } from "../../db/pool.js";

export type DocumentRow = {
  id: string;
  label: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: Date;
};

export type CreateDocumentInput = {
  label: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
};

export async function insertDocument(input: CreateDocumentInput): Promise<DocumentRow> {
  const result = await pool.query<DocumentRow>(
    `INSERT INTO documents (label, original_name, stored_name, mime_type, size_bytes, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.label, input.originalName, input.storedName, input.mimeType, input.sizeBytes, input.uploadedBy],
  );
  return result.rows[0]!;
}

export async function insertRecipients(documentId: string, userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  const values = userIds.map((_, i) => `($1, $${i + 2})`).join(", ");
  await pool.query(
    `INSERT INTO document_recipients (document_id, user_id) VALUES ${values}`,
    [documentId, ...userIds],
  );
}

export async function findDocumentById(id: string): Promise<DocumentRow | null> {
  const result = await pool.query<DocumentRow>("SELECT * FROM documents WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function isRecipient(documentId: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    "SELECT 1 FROM document_recipients WHERE document_id = $1 AND user_id = $2",
    [documentId, userId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function listDocumentsForRecipient(userId: string): Promise<DocumentRow[]> {
  const result = await pool.query<DocumentRow>(
    `SELECT d.* FROM documents d
     JOIN document_recipients dr ON dr.document_id = d.id
     WHERE dr.user_id = $1
     ORDER BY d.created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function listDocumentsUploadedBy(uploadedBy: string): Promise<DocumentRow[]> {
  const result = await pool.query<DocumentRow>(
    "SELECT * FROM documents WHERE uploaded_by = $1 ORDER BY created_at DESC",
    [uploadedBy],
  );
  return result.rows;
}

export async function listAllDocuments(): Promise<DocumentRow[]> {
  const result = await pool.query<DocumentRow>("SELECT * FROM documents ORDER BY created_at DESC");
  return result.rows;
}

export type RecipientLinkRow = { document_id: string; user_id: string };

/** En lote para toda una lista de documentos, en vez de una consulta por
 * documento (ver documents/service.ts::listSentDocuments). */
export async function listRecipientsForDocuments(documentIds: string[]): Promise<RecipientLinkRow[]> {
  if (documentIds.length === 0) return [];
  const result = await pool.query<RecipientLinkRow>(
    "SELECT document_id, user_id FROM document_recipients WHERE document_id = ANY($1)",
    [documentIds],
  );
  return result.rows;
}

export async function deleteDocumentById(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM documents WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
