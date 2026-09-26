import type { ActivityEventType, AdminActivityEventDTO, Paginated } from "@clearwork/shared";
import { apiFetch, downloadFile } from "./client.js";

/** Mismo feed que /admin/activity, acotado al equipo del supervisor que
 * pregunta (issue #134) — ver apps/api/src/modules/admin/service.ts's
 * listTeamActivity. */
export type SupervisorActivityQuery = {
  types?: ActivityEventType[];
  sortOrder?: "newest" | "oldest";
  page?: number;
  pageSize?: number;
};

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function fetchTeamActivity(
  query: SupervisorActivityQuery = {},
): Promise<Paginated<AdminActivityEventDTO>> {
  const { types, ...rest } = query;
  return apiFetch<Paginated<AdminActivityEventDTO>>(
    `/supervisor/activity${buildQuery({ ...rest, types: types && types.length > 0 ? types.join(",") : undefined })}`,
  );
}

export function exportTeamActivityCsv(
  query: Omit<SupervisorActivityQuery, "page" | "pageSize"> = {},
): Promise<void> {
  const { types, ...rest } = query;
  const qs = buildQuery({ ...rest, types: types && types.length > 0 ? types.join(",") : undefined });
  return downloadFile(`/supervisor/activity/export${qs}`, "actividad-equipo.csv");
}
