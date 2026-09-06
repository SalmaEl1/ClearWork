import type { AppSettingsDTO } from "@clearwork/shared";
import { getSettingsRow, updateSettingsRow } from "./repository.js";
import type { AppSettingsRow } from "./types.js";
import type { z } from "zod";
import type { updateSettingsSchema } from "./schemas.js";

type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

function toDTO(row: AppSettingsRow): AppSettingsDTO {
  return {
    defaultWeeklyTargetHours: Number(row.default_weekly_target_hours),
    excludeWeekendsFromVacationDays: row.exclude_weekends_from_vacation_days,
    officeSeatCount: row.office_seat_count,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getSettings(): Promise<AppSettingsDTO> {
  return toDTO(await getSettingsRow());
}

export async function updateSettings(input: UpdateSettingsInput): Promise<AppSettingsDTO> {
  // excludeWeekendsFromVacationDays y officeSeatCount son opcionales: si
  // no se mandan, se dejan como estaban (igual que ya pasaba con
  // defaultWeeklyTargetHours antes de que existieran estos otros dos
  // ajustes).
  const current = await getSettingsRow();
  const excludeWeekendsFromVacationDays =
    input.excludeWeekendsFromVacationDays ?? current.exclude_weekends_from_vacation_days;
  const officeSeatCount = input.officeSeatCount ?? current.office_seat_count;

  return toDTO(
    await updateSettingsRow(input.defaultWeeklyTargetHours, excludeWeekendsFromVacationDays, officeSeatCount),
  );
}
