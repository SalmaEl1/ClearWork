export type AppSettingsRow = {
  id: boolean;
  default_weekly_target_hours: string; // NUMERIC llega como string desde pg
  updated_at: Date;
};
