import { z } from "zod";
import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES } from "@clearwork/shared";

export const notificationTypeParamSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
});

export const updatePreferenceSchema = z.object({
  channel: z.enum(NOTIFICATION_CHANNELS),
});
