import { describe, expect, it } from "vitest";
import {
  ACTIVITY_EVENT_TYPES,
  ADMIN_CREATABLE_ROLES,
  BREAK_TYPES,
  CONTRACT_TYPES,
  DEFAULT_NOTIFICATION_CHANNEL,
  LEAVE_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
  ROLES,
  TASK_STATUSES,
  VACATION_STATUSES,
  WORKDAY_HOURS,
} from "../src/roles.js";

describe("catálogos de roles y enumerados", () => {
  it("los roles son exactamente worker, supervisor y admin", () => {
    expect([...ROLES]).toEqual(["worker", "supervisor", "admin"]);
    expect([...ADMIN_CREATABLE_ROLES]).toEqual(["worker", "supervisor", "admin"]);
  });

  it("estados de tarea y tipos de descanso", () => {
    expect([...TASK_STATUSES]).toEqual(["pending", "in_progress", "done"]);
    expect([...BREAK_TYPES]).toEqual(["lunch", "ergonomic"]);
  });

  it("una jornada completa son 8 horas", () => {
    expect(WORKDAY_HOURS).toBe(8);
  });

  it("estados de vacaciones, tipos de baja y de contrato", () => {
    expect(VACATION_STATUSES).toContain("cancelled");
    expect(LEAVE_TYPES).toContain("maternity_paternity");
    expect(CONTRACT_TYPES).toEqual(["full_time", "part_time", "internship"]);
  });

  it("cada tipo de notificación tiene un canal por defecto", () => {
    for (const type of NOTIFICATION_TYPES) {
      expect(NOTIFICATION_CHANNELS).toContain(DEFAULT_NOTIFICATION_CHANNEL[type]);
    }
  });

  it("solo task_assigned y task_status_changed mandaban correo por defecto", () => {
    const withEmail = NOTIFICATION_TYPES.filter((t) =>
      ["both", "email"].includes(DEFAULT_NOTIFICATION_CHANNEL[t]),
    );
    expect(withEmail.sort()).toEqual(["document_shared", "task_assigned", "task_status_changed"]);
  });

  it("los tipos de evento de actividad incluyen altas y bajas de miembros", () => {
    expect(ACTIVITY_EVENT_TYPES).toContain("member_joined");
    expect(ACTIVITY_EVENT_TYPES).toContain("member_left");
  });
});
