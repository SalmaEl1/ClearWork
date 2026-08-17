import type { AppSettingsDTO } from "@clearwork/shared";
import { getSettingsRow, updateSettingsRow } from "./repository.js";
import type { AppSettingsRow } from "./types.js";
import type { z } from "zod";
import type { updateSettingsSchema } from "./schemas.js";

type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

function toDTO(row: AppSettingsRow): AppSettingsDTO {
  return {
    defaultWeeklyTargetHours: Number(row.default_weekly_target_hours),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getSettings(): Promise<AppSettingsDTO> {
  return toDTO(await getSettingsRow());
}

export async function updateSettings(input: UpdateSettingsInput): Promise<AppSettingsDTO> {
  return toDTO(await updateSettingsRow(input.defaultWeeklyTargetHours));
}
