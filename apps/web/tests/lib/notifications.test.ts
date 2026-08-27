import type { NotificationDTO } from "@clearwork/shared";
import { describe, expect, it } from "vitest";
import { notificationLink, notificationMessage } from "../../src/lib/notifications.js";

function base(overrides: Partial<NotificationDTO> & Pick<NotificationDTO, "type">): NotificationDTO {
  return {
    id: "notif-1",
    readAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as NotificationDTO;
}

describe("notificationMessage", () => {
  it("describe una asignación de tarea", () => {
    const n = base({ type: "task_assigned", taskId: "t1", taskTitle: "Diseñar login", projectName: "Web" });
    expect(notificationMessage(n)).toBe('Se le ha asignado la tarea "Diseñar login" (Web).');
  });

  it("describe una desasignación de tarea", () => {
    const n = base({ type: "task_unassigned", taskTitle: "Diseñar login", projectName: "Web" });
    expect(notificationMessage(n)).toBe('Se le ha retirado la tarea "Diseñar login" (Web).');
  });

  it("describe un cambio de estado con quién lo hizo y la etiqueta en español", () => {
    const n = base({
      type: "task_status_changed",
      taskId: "t1",
      taskTitle: "Diseñar login",
      projectName: "Web",
      status: "done",
      actorName: "Ana Supervisor",
    });
    expect(notificationMessage(n)).toBe('Ana Supervisor ha actualizado el estado de "Diseñar login" (Web) a hecha.');
  });

  it("describe que ha sido incorporado a un proyecto", () => {
    const n = base({ type: "project_member_added", projectName: "Web" });
    expect(notificationMessage(n)).toBe("Se le ha incorporado al proyecto Web.");
  });

  it("describe que ha sido retirado de un proyecto", () => {
    const n = base({ type: "project_member_removed", projectName: "Web" });
    expect(notificationMessage(n)).toBe("Se le ha retirado del proyecto Web.");
  });

  it("describe que ya no supervisa un proyecto", () => {
    const n = base({ type: "project_supervisor_removed", projectName: "Web" });
    expect(notificationMessage(n)).toBe("Ya no supervisa el proyecto Web.");
  });

  it("describe una solicitud de vacaciones aprobada", () => {
    const n = base({ type: "vacation_decided", status: "approved", startDate: "2026-03-01", endDate: "2026-03-10" });
    expect(notificationMessage(n)).toBe(
      "Su solicitud de vacaciones (2026-03-01 a 2026-03-10) ha sido aprobada.",
    );
  });

  it("describe una solicitud de vacaciones rechazada", () => {
    const n = base({ type: "vacation_decided", status: "rejected", startDate: "2026-03-01", endDate: "2026-03-10" });
    expect(notificationMessage(n)).toBe(
      "Su solicitud de vacaciones (2026-03-01 a 2026-03-10) ha sido rechazada.",
    );
  });
});

describe("notificationLink", () => {
  it("enlaza a la tarea para task_assigned, con la ruta del rol de quien la recibe", () => {
    const n = base({ type: "task_assigned", taskId: "t1", taskTitle: "X", projectName: "P" });
    expect(notificationLink(n, "worker")).toBe("/worker/tasks/t1");
    expect(notificationLink(n, "supervisor")).toBe("/supervisor/tasks/t1");
  });

  it("enlaza a la tarea para task_status_changed", () => {
    const n = base({
      type: "task_status_changed",
      taskId: "t1",
      taskTitle: "X",
      projectName: "P",
      status: "pending",
      actorName: "A",
    });
    expect(notificationLink(n, "worker")).toBe("/worker/tasks/t1");
  });

  it("no enlaza a ningún sitio para el resto de tipos (ya no hay recurso al que ir)", () => {
    expect(notificationLink(base({ type: "task_unassigned", taskTitle: "X", projectName: "P" }), "worker")).toBeNull();
    expect(notificationLink(base({ type: "project_member_added", projectName: "P" }), "worker")).toBeNull();
    expect(notificationLink(base({ type: "project_member_removed", projectName: "P" }), "worker")).toBeNull();
    expect(
      notificationLink(base({ type: "project_supervisor_removed", projectName: "P" }), "supervisor"),
    ).toBeNull();
  });

  it("enlaza a /worker/vacations para vacation_decided, solo si quien la recibe es worker", () => {
    const n = base({ type: "vacation_decided", status: "approved", startDate: "2026-03-01", endDate: "2026-03-10" });
    expect(notificationLink(n, "worker")).toBe("/worker/vacations");
    expect(notificationLink(n, "supervisor")).toBeNull();
  });
});
