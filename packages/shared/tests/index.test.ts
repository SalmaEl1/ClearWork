import { describe, expect, it } from "vitest";
import { NOTIFICATION_TYPES, notificationMessage, ROLES, TIME_ENTRY_UNITS } from "../src/index.js";

/** El index solo reexporta los tres módulos; esta prueba fija que el
 * punto de entrada del paquete expone lo que consumen api y web. */
describe("@clearwork/shared (index)", () => {
  it("reexporta los enumerados de roles y los DTO", () => {
    expect(ROLES).toContain("admin");
    expect([...TIME_ENTRY_UNITS]).toEqual(["hours", "minutes", "days"]);
    expect(NOTIFICATION_TYPES.length).toBeGreaterThan(0);
  });

  it("reexporta los ayudantes de texto de notificaciones", () => {
    expect(notificationMessage({ type: "project_assigned", projectName: "Web" })).toBe(
      "Se le ha asignado el proyecto Web.",
    );
  });
});
