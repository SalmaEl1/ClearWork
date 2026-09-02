import type { ProjectDetailDTO } from "@clearwork/shared";
import { apiFetch } from "./client.js";

/** Solo lectura: el trabajador nunca gestiona su proyecto, solo lo ve. */
export function fetchMyProjectAsWorker(): Promise<ProjectDetailDTO> {
  return apiFetch<ProjectDetailDTO>("/worker/project");
}
