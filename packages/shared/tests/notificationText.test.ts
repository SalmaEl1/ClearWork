import { describe, expect, it } from "vitest";
import type { NotificationEvent } from "../src/dto.js";
import { notificationLink, notificationMessage } from "../src/notificationText.js";

describe("notificationMessage", () => {
  const cases: [NotificationEvent, string][] = [
    [
      { type: "task_assigned", taskId: "t1", taskTitle: "Diseñar login", projectName: "Web" },
      'Se le ha asignado la tarea "Diseñar login" (Web).',
    ],
    [
      { type: "task_unassigned", taskTitle: "Diseñar login", projectName: "Web" },
      'Se le ha retirado la tarea "Diseñar login" (Web).',
    ],
    [
      {
        type: "task_status_changed",
        taskId: "t1",
        taskTitle: "Diseñar login",
        projectName: "Web",
        status: "done",
        actorName: "Ana",
      },
      'Ana ha actualizado el estado de "Diseñar login" (Web) a hecha.',
    ],
    [{ type: "project_member_added", projectName: "Web" }, "Se le ha incorporado al proyecto Web."],
    [{ type: "project_member_removed", projectName: "Web" }, "Se le ha retirado del proyecto Web."],
    [{ type: "project_supervisor_removed", projectName: "Web" }, "Ya no supervisa el proyecto Web."],
    [{ type: "project_assigned", projectName: "Web" }, "Se le ha asignado el proyecto Web."],
    [
      { type: "vacation_decided", status: "approved", startDate: "2026-03-01", endDate: "2026-03-10" },
      "Su solicitud de vacaciones (2026-03-01 a 2026-03-10) ha sido aprobada.",
    ],
    [
      { type: "vacation_decided", status: "rejected", startDate: "2026-03-01", endDate: "2026-03-10" },
      "Su solicitud de vacaciones (2026-03-01 a 2026-03-10) ha sido rechazada.",
    ],
    [
      { type: "vacation_requested", workerName: "Juan", startDate: "2026-03-01", endDate: "2026-03-10" },
      "Juan ha solicitado vacaciones (2026-03-01 a 2026-03-10).",
    ],
    [
      {
        type: "absence_scheduled",
        workerName: "Juan",
        date: "2026-03-01",
        startTime: "09:00",
        endTime: "11:00",
        reason: "médico",
      },
      "Juan ha programado una ausencia el 2026-03-01 de 09:00 a 11:00 (médico).",
    ],
    [
      { type: "document_shared", documentId: "d1", label: "Nómina", uploaderName: "Ana" },
      'Ana ha compartido con usted el documento "Nómina".',
    ],
  ];

  it.each(cases)("describe %o", (event, expected) => {
    expect(notificationMessage(event)).toBe(expected);
  });

  it("traduce cada estado de tarea a su etiqueta en español", () => {
    const make = (status: "pending" | "in_progress" | "done") =>
      notificationMessage({
        type: "task_status_changed",
        taskId: "t1",
        taskTitle: "X",
        projectName: "P",
        status,
        actorName: "A",
      });
    expect(make("pending")).toContain("a pendiente.");
    expect(make("in_progress")).toContain("a en curso.");
    expect(make("done")).toContain("a hecha.");
  });
});

describe("notificationLink", () => {
  it("lleva a la tarea, con el prefijo del rol de quien la recibe", () => {
    const n: NotificationEvent = { type: "task_assigned", taskId: "t1", taskTitle: "X", projectName: "P" };
    expect(notificationLink(n, "worker")).toBe("/worker/tasks/t1");
    expect(notificationLink(n, "supervisor")).toBe("/supervisor/tasks/t1");
    expect(
      notificationLink(
        { type: "task_status_changed", taskId: "t9", taskTitle: "X", projectName: "P", status: "pending", actorName: "A" },
        "worker",
      ),
    ).toBe("/worker/tasks/t9");
  });

  it("solo enlaza cuando quien la recibe conserva acceso al recurso", () => {
    const decided: NotificationEvent = {
      type: "vacation_decided",
      status: "approved",
      startDate: "2026-03-01",
      endDate: "2026-03-02",
    };
    expect(notificationLink(decided, "worker")).toBe("/worker/vacations");
    expect(notificationLink(decided, "supervisor")).toBeNull();

    const requested: NotificationEvent = {
      type: "vacation_requested",
      workerName: "Juan",
      startDate: "2026-03-01",
      endDate: "2026-03-02",
    };
    expect(notificationLink(requested, "supervisor")).toBe("/supervisor/vacations");
    expect(notificationLink(requested, "worker")).toBeNull();

    const assigned: NotificationEvent = { type: "project_assigned", projectName: "Web" };
    expect(notificationLink(assigned, "supervisor")).toBe("/supervisor/projects");
    expect(notificationLink(assigned, "worker")).toBeNull();

    const shared: NotificationEvent = {
      type: "document_shared",
      documentId: "d1",
      label: "Nómina",
      uploaderName: "Ana",
    };
    expect(notificationLink(shared, "worker")).toBe("/worker/documents");
    expect(notificationLink(shared, "supervisor")).toBeNull();
  });

  it("no enlaza a ningún sitio para los tipos meramente informativos", () => {
    for (const type of [
      "task_unassigned",
      "project_member_added",
      "project_member_removed",
      "project_supervisor_removed",
    ] as const) {
      expect(notificationLink({ type, projectName: "P", taskTitle: "X" } as NotificationEvent, "worker")).toBeNull();
    }
  });
});
