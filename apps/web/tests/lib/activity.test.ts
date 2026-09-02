import { ACTIVITY_EVENT_TYPES } from "@clearwork/shared";
import { describe, expect, it } from "vitest";
import { IconFolder, IconMemberChange, IconTasks, IconUsers } from "../../src/components/NavIcons.js";
import { activityIcon } from "../../src/lib/activity.js";

describe("activityIcon", () => {
  it("devuelve un icono para cada tipo de evento de actividad", () => {
    for (const type of ACTIVITY_EVENT_TYPES) {
      expect(activityIcon(type)).toBeDefined();
    }
  });

  it("agrupa por categoría: cuentas, proyectos, tareas y membresías", () => {
    expect(activityIcon("user_created")).toBe(IconUsers);
    expect(activityIcon("user_role_changed")).toBe(IconUsers);
    expect(activityIcon("project_archived")).toBe(IconFolder);
    expect(activityIcon("project_deleted")).toBe(IconFolder);
    expect(activityIcon("task_status_changed")).toBe(IconTasks);
    expect(activityIcon("member_joined")).toBe(IconMemberChange);
    expect(activityIcon("member_left")).toBe(IconMemberChange);
  });
});
