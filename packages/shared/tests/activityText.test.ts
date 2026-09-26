import { describe, expect, it } from "vitest";
import type { AdminActivityEventDTO } from "../src/dto.js";
import { activityMessage } from "../src/activityText.js";

describe("activityMessage", () => {
  const cases: [AdminActivityEventDTO, string][] = [
    [
      { type: "user_created", occurredAt: "2026-01-01T00:00:00.000Z", userName: "Ana", role: "worker" },
      "Ana se dio de alta como trabajador",
    ],
    [
      { type: "user_updated", occurredAt: "2026-01-01T00:00:00.000Z", userName: "Ana" },
      "Se editó la cuenta de Ana",
    ],
    [
      {
        type: "user_role_changed",
        occurredAt: "2026-01-01T00:00:00.000Z",
        userName: "Ana",
        fromRole: "worker",
        toRole: "supervisor",
      },
      "Ana pasó de trabajador a supervisor",
    ],
    [
      { type: "user_deleted", occurredAt: "2026-01-01T00:00:00.000Z", userName: "Ana", role: "worker" },
      "Se eliminó la cuenta de Ana (trabajador)",
    ],
    [
      {
        type: "project_created",
        occurredAt: "2026-01-01T00:00:00.000Z",
        projectName: "Web",
        supervisorName: "Luis",
      },
      "Se creó el proyecto Web, a cargo de Luis",
    ],
    [
      { type: "project_updated", occurredAt: "2026-01-01T00:00:00.000Z", projectName: "Web" },
      "Se editó el proyecto Web",
    ],
    [
      { type: "project_archived", occurredAt: "2026-01-01T00:00:00.000Z", projectName: "Web", archived: true },
      "Web se archivó",
    ],
    [
      { type: "project_archived", occurredAt: "2026-01-01T00:00:00.000Z", projectName: "Web", archived: false },
      "Web se desarchivó",
    ],
    [
      {
        type: "project_supervisor_changed",
        occurredAt: "2026-01-01T00:00:00.000Z",
        projectName: "Web",
        fromSupervisorName: "Luis",
        toSupervisorName: "Ana",
      },
      "Web pasó de Luis a Ana",
    ],
    [
      { type: "project_deleted", occurredAt: "2026-01-01T00:00:00.000Z", projectName: "Web" },
      "Se eliminó el proyecto Web",
    ],
    [
      {
        type: "task_created",
        occurredAt: "2026-01-01T00:00:00.000Z",
        userName: "Luis",
        taskTitle: "Diseñar login",
        projectName: "Web",
      },
      'Luis creó la tarea "Diseñar login" en Web',
    ],
    [
      {
        type: "task_status_changed",
        occurredAt: "2026-01-01T00:00:00.000Z",
        userName: "Ana",
        taskTitle: "Diseñar login",
        projectName: "Web",
        toStatus: "done",
      },
      'Ana movió "Diseñar login" (Web) a hecha',
    ],
    [
      {
        type: "task_deleted",
        occurredAt: "2026-01-01T00:00:00.000Z",
        userName: "Luis",
        taskTitle: "Diseñar login",
        projectName: "Web",
      },
      'Luis eliminó la tarea "Diseñar login" de Web',
    ],
    [
      { type: "member_joined", occurredAt: "2026-01-01T00:00:00.000Z", userName: "Ana", projectName: "Web" },
      "Ana se incorporó a Web",
    ],
    [
      { type: "member_left", occurredAt: "2026-01-01T00:00:00.000Z", userName: "Ana", projectName: "Web" },
      "Ana salió de Web",
    ],
  ];

  it.each(cases)("%o -> %s", (event, expected) => {
    expect(activityMessage(event)).toBe(expected);
  });
});
