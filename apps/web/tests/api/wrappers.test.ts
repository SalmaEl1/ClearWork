import { beforeEach, describe, expect, it, vi } from "vitest";

/** Todos los módulos de apps/web/src/api son envoltorios finos sobre
 * client.ts: construyen la ruta, el método y el cuerpo y delegan. Aquí se
 * comprueba justamente eso — que cada función llama a apiFetch con lo que
 * toca — con client.ts mockeado (ya se prueba aparte en client.test.ts). */
const apiFetch = vi.hoisted(() => vi.fn(() => Promise.resolve({ items: [] })));
const apiFetchFormData = vi.hoisted(() => vi.fn(() => Promise.resolve({})));
const downloadFile = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock("../../src/api/client.js", () => ({
  apiFetch,
  apiFetchFormData,
  downloadFile,
  ApiError: class ApiError extends Error {},
}));

import * as admin from "../../src/api/admin.js";
import * as documents from "../../src/api/documents.js";
import * as holidays from "../../src/api/holidays.js";
import * as leaves from "../../src/api/leaves.js";
import * as notificationPreferences from "../../src/api/notificationPreferences.js";
import * as notifications from "../../src/api/notifications.js";
import * as scheduledAbsences from "../../src/api/scheduledAbsences.js";
import * as seats from "../../src/api/seats.js";
import * as supervisorActivity from "../../src/api/supervisorActivity.js";
import * as supervisorProjects from "../../src/api/supervisorProjects.js";
import * as tasks from "../../src/api/tasks.js";
import * as vacations from "../../src/api/vacations.js";
import * as workSessions from "../../src/api/workSessions.js";
import * as workerProject from "../../src/api/workerProject.js";

beforeEach(() => {
  apiFetch.mockClear().mockResolvedValue({ items: [] });
  apiFetchFormData.mockClear();
  downloadFile.mockClear();
});

/** Última ruta / opciones con las que se llamó a apiFetch. */
function lastCall() {
  return apiFetch.mock.calls.at(-1) as [string, { method?: string; body?: unknown } | undefined];
}

describe("holidays", () => {
  it("fetchHolidays añade el año a la query", async () => {
    await holidays.fetchHolidays(2026);
    expect(lastCall()[0]).toBe("/holidays?year=2026");
  });
  it("createHoliday hace POST con el cuerpo", async () => {
    await holidays.createHoliday({ date: "2026-01-06", label: "Reyes" } as never);
    expect(lastCall()).toEqual(["/holidays", { method: "POST", body: { date: "2026-01-06", label: "Reyes" } }]);
  });
  it("deleteHoliday hace DELETE por id", async () => {
    await holidays.deleteHoliday("h1");
    expect(lastCall()).toEqual(["/holidays/h1", { method: "DELETE" }]);
  });
});

describe("seats", () => {
  it("fetchSeatAvailability filtra por fecha", async () => {
    await seats.fetchSeatAvailability("2026-03-01");
    expect(lastCall()[0]).toBe("/seats?date=2026-03-01");
  });
  it("reserveSeat hace POST", async () => {
    await seats.reserveSeat({ date: "2026-03-01", seatNumber: 4 } as never);
    expect(lastCall()[1]).toMatchObject({ method: "POST" });
  });
  it("cancelSeatReservation hace DELETE por id", async () => {
    await seats.cancelSeatReservation("r1");
    expect(lastCall()).toEqual(["/seats/r1", { method: "DELETE" }]);
  });
  it("fetchMySeatReservations filtra por mes", async () => {
    await seats.fetchMySeatReservations("2026-03");
    expect(lastCall()[0]).toBe("/seats/mine?month=2026-03");
  });
});

describe("leaves", () => {
  it("createLeave / fetchLeaves / deleteLeave / endLeave", async () => {
    await leaves.createLeave({ userId: "u1", type: "sick_leave", startDate: "2026-01-01" } as never);
    expect(lastCall()[1]).toMatchObject({ method: "POST" });
    await leaves.fetchLeaves("u1");
    expect(lastCall()[0]).toBe("/leaves?userId=u1");
    await leaves.deleteLeave("l1");
    expect(lastCall()).toEqual(["/leaves/l1", { method: "DELETE" }]);
    await leaves.endLeave("l1");
    expect(lastCall()).toEqual(["/leaves/l1/end", { method: "POST" }]);
    await leaves.fetchTeamLeaves();
    expect(lastCall()[0]).toBe("/leaves/team");
  });
});

describe("vacations", () => {
  it("cubre las rutas de solicitud, saldo, reglas y decisiones", async () => {
    await vacations.createVacationRequest({ startDate: "2026-03-01", endDate: "2026-03-01" } as never);
    expect(lastCall()).toEqual(["/vacations", { method: "POST", body: { startDate: "2026-03-01", endDate: "2026-03-01" } }]);
    await vacations.fetchMyVacationRequests();
    expect(lastCall()[0]).toBe("/vacations/mine");
    await vacations.fetchMyVacationBalance();
    expect(lastCall()[0]).toBe("/vacations/balance");
    await vacations.fetchVacationRules();
    expect(lastCall()[0]).toBe("/vacations/rules");
    await vacations.cancelVacationRequest("v1");
    expect(lastCall()).toEqual(["/vacations/v1/cancel", { method: "POST" }]);
    await vacations.fetchTeamVacationRequests();
    expect(lastCall()[0]).toBe("/vacations/team");
    await vacations.approveVacationRequest("v1");
    expect(lastCall()).toEqual(["/vacations/v1/approve", { method: "POST" }]);
    await vacations.rejectVacationRequest("v1");
    expect(lastCall()).toEqual(["/vacations/v1/reject", { method: "POST" }]);
  });
});

describe("scheduledAbsences", () => {
  it("cubre autoservicio y las variantes de equipo del supervisor", async () => {
    await scheduledAbsences.createScheduledAbsence({ date: "2026-03-01" } as never);
    expect(lastCall()).toEqual(["/scheduled-absences", { method: "POST", body: { date: "2026-03-01" } }]);
    await scheduledAbsences.fetchMyScheduledAbsences();
    expect(lastCall()[0]).toBe("/scheduled-absences");
    await scheduledAbsences.deleteScheduledAbsence("a1");
    expect(lastCall()).toEqual(["/scheduled-absences/a1", { method: "DELETE" }]);
    await scheduledAbsences.fetchTeamMemberScheduledAbsences("u1");
    expect(lastCall()[0]).toBe("/scheduled-absences/team/u1");
    await scheduledAbsences.fetchTeamScheduledAbsences();
    expect(lastCall()[0]).toBe("/scheduled-absences/team");
    await scheduledAbsences.createTeamScheduledAbsence({ userId: "u1", date: "2026-03-01" } as never);
    expect(lastCall()).toEqual(["/scheduled-absences/team", { method: "POST", body: { userId: "u1", date: "2026-03-01" } }]);
    await scheduledAbsences.updateScheduledAbsence("a1", { reason: "médico" } as never);
    expect(lastCall()).toEqual(["/scheduled-absences/a1", { method: "PATCH", body: { reason: "médico" } }]);
  });
});

describe("supervisorProjects", () => {
  it("cubre lectura, edición y gestión de miembros del propio proyecto", async () => {
    await supervisorProjects.fetchMyProject("p1");
    expect(lastCall()[0]).toBe("/supervisor/projects/p1");
    await supervisorProjects.updateMyProject("p1", { name: "Nuevo" } as never);
    expect(lastCall()).toEqual(["/supervisor/projects/p1", { method: "PATCH", body: { name: "Nuevo" } }]);
    await supervisorProjects.assignMemberToMyProject("p1", { userId: "u1" } as never);
    expect(lastCall()).toEqual(["/supervisor/projects/p1/members", { method: "POST", body: { userId: "u1" } }]);
    await supervisorProjects.removeMemberFromMyProject("p1", "u1");
    expect(lastCall()).toEqual(["/supervisor/projects/p1/members/u1", { method: "DELETE" }]);
    await supervisorProjects.fetchWorkersForAssignment();
    expect(lastCall()[0]).toBe("/supervisor/projects/workers");
  });
});

describe("notifications", () => {
  it("pagina, cuenta las no leídas y marca como leídas", async () => {
    await notifications.fetchNotifications();
    expect(lastCall()[0]).toBe("/notifications?page=1&pageSize=20");
    await notifications.fetchNotifications(3, 50);
    expect(lastCall()[0]).toBe("/notifications?page=3&pageSize=50");
    await notifications.fetchUnreadNotificationCount();
    expect(lastCall()[0]).toBe("/notifications/unread-count");
    await notifications.markNotificationRead("n1");
    expect(lastCall()).toEqual(["/notifications/n1/read", { method: "PATCH" }]);
    await notifications.markAllNotificationsRead();
    expect(lastCall()).toEqual(["/notifications/read-all", { method: "POST" }]);
  });
});

describe("notificationPreferences", () => {
  it("lee la lista y actualiza el canal de un tipo", async () => {
    await notificationPreferences.fetchNotificationPreferences();
    expect(lastCall()[0]).toBe("/notification-preferences");
    await notificationPreferences.updateNotificationPreference("task_assigned", "email");
    expect(lastCall()).toEqual(["/notification-preferences/task_assigned", { method: "PATCH", body: { channel: "email" } }]);
  });
});

describe("workSessions", () => {
  it("cubre fichaje, descansos e historial (propio y de equipo)", async () => {
    await workSessions.fetchActiveSession();
    expect(lastCall()[0]).toBe("/work-sessions/active");
    await workSessions.clockIn();
    expect(lastCall()).toEqual(["/work-sessions/clock-in", { method: "POST" }]);
    await workSessions.clockOut();
    expect(lastCall()).toEqual(["/work-sessions/clock-out", { method: "POST" }]);
    await workSessions.startBreak("lunch");
    expect(lastCall()).toEqual(["/work-sessions/breaks/start", { method: "POST", body: { type: "lunch" } }]);
    await workSessions.endBreak();
    expect(lastCall()).toEqual(["/work-sessions/breaks/end", { method: "POST" }]);
    await workSessions.fetchWorkSessionHistory();
    expect(lastCall()[0]).toBe("/work-sessions");
    await workSessions.fetchWorkSessionHistory(10);
    expect(lastCall()[0]).toBe("/work-sessions?limit=10");
    await workSessions.fetchTeamMemberWorkSessionHistory("u1");
    expect(lastCall()[0]).toBe("/work-sessions/team/u1");
    await workSessions.fetchTeamMemberWorkSessionHistory("u1", 5);
    expect(lastCall()[0]).toBe("/work-sessions/team/u1?limit=5");
  });
});

describe("workerProject", () => {
  it("pide el proyecto del trabajador en solo lectura", async () => {
    await workerProject.fetchMyProjectAsWorker();
    expect(lastCall()[0]).toBe("/worker/project");
  });
});

describe("tasks", () => {
  it("construye la query de la lista solo con los filtros presentes", async () => {
    await tasks.fetchTasks();
    expect(lastCall()[0]).toBe("/tasks");
    await tasks.fetchTasks({ status: "done", projectId: "p1", page: 2, pageSize: 10 });
    expect(lastCall()[0]).toBe("/tasks?status=done&projectId=p1&page=2&pageSize=10");
  });
  it("cubre detalle, alta, edición, estado, progreso, tiempo y borrado", async () => {
    await tasks.fetchTask("t1");
    expect(lastCall()[0]).toBe("/tasks/t1");
    await tasks.createTask({ title: "X", projectId: "p1" } as never);
    expect(lastCall()[1]).toMatchObject({ method: "POST" });
    await tasks.updateTask("t1", { title: "Y" } as never);
    expect(lastCall()).toEqual(["/tasks/t1", { method: "PATCH", body: { title: "Y" } }]);
    await tasks.updateTaskStatus("t1", "in_progress");
    expect(lastCall()).toEqual(["/tasks/t1/status", { method: "PATCH", body: { status: "in_progress" } }]);
    await tasks.updateTaskProgress("t1", 40);
    expect(lastCall()).toEqual(["/tasks/t1/progress", { method: "PATCH", body: { progressPercentage: 40 } }]);
    await tasks.logTaskTime("t1", { minutes: 30 } as never);
    expect(lastCall()).toEqual(["/tasks/t1/time-entries", { method: "POST", body: { minutes: 30 } }]);
    await tasks.deleteTask("t1");
    expect(lastCall()).toEqual(["/tasks/t1", { method: "DELETE" }]);
    await tasks.fetchMyProjects();
    expect(lastCall()[0]).toBe("/supervisor/projects");
    await tasks.fetchMyProjectMembers("p1");
    expect(lastCall()[0]).toBe("/supervisor/projects/p1/members");
  });
});

describe("admin", () => {
  it("actividad: une los tipos con coma y omite el filtro si no hay ninguno", async () => {
    await admin.fetchAdminActivity();
    expect(lastCall()[0]).toBe("/admin/activity");
    await admin.fetchAdminActivity({ types: ["user_created", "user_deleted"], sortOrder: "oldest", page: 2 });
    expect(lastCall()[0]).toBe("/admin/activity?sortOrder=oldest&page=2&types=user_created%2Cuser_deleted");
  });

  it("usuarios: lista paginada, lista completa, alta, detalle, edición y borrado", async () => {
    apiFetch.mockResolvedValueOnce({ items: [{ id: "u1" }] });
    await expect(admin.fetchAllAdminUsers()).resolves.toEqual([{ id: "u1" }]);
    expect(lastCall()[0]).toBe("/admin/users?pageSize=1000");
    await admin.fetchAdminUsers({ search: "ana", role: "worker" });
    expect(lastCall()[0]).toBe("/admin/users?search=ana&role=worker");
    await admin.createAdminUser({ email: "a@b.c", fullName: "Ana", role: "worker" } as never);
    expect(lastCall()[1]).toMatchObject({ method: "POST" });
    await admin.fetchAdminUser("u1");
    expect(lastCall()[0]).toBe("/admin/users/u1");
    await admin.updateAdminUser("u1", { fullName: "Ana B" } as never);
    expect(lastCall()).toEqual(["/admin/users/u1", { method: "PATCH", body: { fullName: "Ana B" } }]);
    await admin.deleteAdminUser("u1");
    expect(lastCall()).toEqual(["/admin/users/u1", { method: "DELETE" }]);
  });

  it("proyectos: lista, lista completa, detalle, tareas, alta, edición, miembros y borrado", async () => {
    apiFetch.mockResolvedValueOnce({ items: [{ id: "p1" }] });
    await expect(admin.fetchAllAdminProjects()).resolves.toEqual([{ id: "p1" }]);
    expect(lastCall()[0]).toBe("/admin/projects?pageSize=1000");
    await admin.fetchAdminProjects({ search: "web", archived: true });
    expect(lastCall()[0]).toBe("/admin/projects?search=web&archived=true");
    await admin.fetchAdminProject("p1");
    expect(lastCall()[0]).toBe("/admin/projects/p1");
    await admin.fetchAdminProjectTasks("p1");
    expect(lastCall()[0]).toBe("/admin/projects/p1/tasks");
    await admin.createAdminProject({ name: "Web" } as never);
    expect(lastCall()[1]).toMatchObject({ method: "POST" });
    await admin.updateAdminProject("p1", { name: "Web 2" } as never);
    expect(lastCall()).toEqual(["/admin/projects/p1", { method: "PATCH", body: { name: "Web 2" } }]);
    await admin.assignProjectMember("p1", { userId: "u1" } as never);
    expect(lastCall()).toEqual(["/admin/projects/p1/members", { method: "POST", body: { userId: "u1" } }]);
    await admin.removeProjectMember("p1", "u1");
    expect(lastCall()).toEqual(["/admin/projects/p1/members/u1", { method: "DELETE" }]);
    await admin.deleteAdminProject("p1");
    expect(lastCall()).toEqual(["/admin/projects/p1", { method: "DELETE" }]);
  });

  it("ajustes y exportaciones CSV", async () => {
    await admin.fetchAdminSettings();
    expect(lastCall()[0]).toBe("/admin/settings");
    await admin.updateAdminSettings({ vacationDaysPerYear: 22 } as never);
    expect(lastCall()).toEqual(["/admin/settings", { method: "PATCH", body: { vacationDaysPerYear: 22 } }]);
    await admin.exportAdminUsersCsv({ role: "worker" });
    await admin.exportAdminProjectsCsv({ archived: true });
    expect(downloadFile).toHaveBeenCalledWith("/admin/users/export?role=worker", "usuarios.csv");
    expect(downloadFile).toHaveBeenCalledWith("/admin/projects/export?archived=true", "proyectos.csv");
    await admin.exportAdminActivityCsv({ types: ["task_created"], sortOrder: "oldest" });
    expect(downloadFile).toHaveBeenCalledWith(
      "/admin/activity/export?sortOrder=oldest&types=task_created",
      "actividad.csv",
    );
  });
});

describe("supervisorActivity", () => {
  it("lista la actividad del equipo y exporta a CSV con el mismo filtro", async () => {
    await supervisorActivity.fetchTeamActivity({ types: ["task_created", "task_deleted"], sortOrder: "oldest" });
    expect(lastCall()[0]).toBe("/supervisor/activity?sortOrder=oldest&types=task_created%2Ctask_deleted");
    await supervisorActivity.exportTeamActivityCsv({ sortOrder: "oldest" });
    expect(downloadFile).toHaveBeenCalledWith("/supervisor/activity/export?sortOrder=oldest", "actividad-equipo.csv");
  });
});

describe("documents", () => {
  it("lee míos/enviados, borra y descarga", async () => {
    await documents.fetchMyDocuments();
    expect(lastCall()[0]).toBe("/documents/mine");
    await documents.fetchSentDocuments();
    expect(lastCall()[0]).toBe("/documents/sent");
    await documents.deleteDocument("d1");
    expect(lastCall()).toEqual(["/documents/d1", { method: "DELETE" }]);
    await documents.downloadDocument("d1", "nomina.pdf");
    expect(downloadFile).toHaveBeenCalledWith("/documents/d1/download", "nomina.pdf");
  });

  it("createDocument arma un FormData con etiqueta, destinatarios y archivo", async () => {
    const file = new File(["x"], "nomina.pdf", { type: "application/pdf" });
    await documents.createDocument({ label: "Nómina", recipientIds: ["u1", "u2"], file });

    const [path, fd] = apiFetchFormData.mock.calls[0] as [string, FormData];
    expect(path).toBe("/documents");
    expect(fd.get("label")).toBe("Nómina");
    expect(fd.get("recipientIds")).toBe(JSON.stringify(["u1", "u2"]));
    expect(fd.get("file")).toBeInstanceOf(File);
  });
});
