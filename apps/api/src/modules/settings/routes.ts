import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import { getSettingsHandler, updateSettingsHandler } from "./controller.js";
import { updateSettingsSchema } from "./schemas.js";

export const settingsRouter = Router();

settingsRouter.use(authenticate, authorize("admin"));

settingsRouter.get("/", getSettingsHandler);
settingsRouter.patch("/", validateBody(updateSettingsSchema), updateSettingsHandler);
