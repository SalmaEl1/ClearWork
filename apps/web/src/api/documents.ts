import type { DocumentDTO, SentDocumentDTO } from "@clearwork/shared";
import { apiFetch, apiFetchFormData, downloadFile } from "./client.js";

export function fetchMyDocuments(): Promise<DocumentDTO[]> {
  return apiFetch<DocumentDTO[]>("/documents/mine");
}

export function fetchSentDocuments(): Promise<SentDocumentDTO[]> {
  return apiFetch<SentDocumentDTO[]>("/documents/sent");
}

export function createDocument(input: {
  label: string;
  recipientIds: string[];
  file: File;
}): Promise<SentDocumentDTO> {
  const formData = new FormData();
  formData.append("label", input.label);
  formData.append("recipientIds", JSON.stringify(input.recipientIds));
  formData.append("file", input.file);
  return apiFetchFormData<SentDocumentDTO>("/documents", formData);
}

export function deleteDocument(id: string): Promise<void> {
  return apiFetch<void>(`/documents/${id}`, { method: "DELETE" });
}

export function downloadDocument(id: string, originalName: string): Promise<void> {
  return downloadFile(`/documents/${id}/download`, originalName);
}
