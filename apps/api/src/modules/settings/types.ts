export type AppSettingsRow = {
  id: boolean;
  default_weekly_target_hours: string; // NUMERIC llega como string desde pg
  exclude_weekends_from_vacation_days: boolean;
  office_seat_count: number;
  updated_at: Date;
};
