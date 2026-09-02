import type { LeaveType, TimeEntryUnit } from "@clearwork/shared";
import { createLeave } from "../modules/leaves/service.js";
import { findActiveMembership, listProjectsForSupervisor } from "../modules/projects/repository.js";
import { assignMember, createProject } from "../modules/projects/service.js";
import { insertScheduledAbsence } from "../modules/scheduled-absences/repository.js";
import { createScheduledAbsence } from "../modules/scheduled-absences/service.js";
import { listTasksForProject } from "../modules/tasks/repository.js";
import { createTask, logTaskTime, updateTaskProgress, updateTaskStatus } from "../modules/tasks/service.js";
import { findUserByEmail } from "../modules/users/repository.js";
import { insertVacationRequest, updateVacationStatus } from "../modules/vacations/repository.js";
import { createVacationRequest } from "../modules/vacations/service.js";
import { listLeavesForUser } from "../modules/leaves/repository.js";
import { listScheduledAbsencesForUser } from "../modules/scheduled-absences/repository.js";
import { listVacationRequestsForUser } from "../modules/vacations/repository.js";
import { todayDateString } from "../shared/time.js";
import { pool } from "./pool.js";

const WORKER_EMAIL = "worker-demo@clearwork.dev";
const SUPERVISOR_EMAIL = "supervisor-demo@clearwork.dev";
const ADMIN_EMAIL = "admin@clearwork.dev";

/** Fecha relativa a hoy, nunca en duro: los mismos motivos que en los
 * tests (ver CLAUDE.md/memoria de sesión) — un valor fijo se vuelve
 * pasado con el tiempo y algunos de estos endpoints exigen "hoy o
 * futuro" al crear. */
function offsetDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return todayDateString(d);
}

/**
 * Rellena de datos de ejemplo las tres cuentas de demo ya existentes
 * (worker-demo, supervisor-demo, admin) — nunca las crea ni les toca la
 * contraseña, solo las busca por email. Pensado para poder ejecutarse
 * varias veces sin duplicar nada: cada bloque comprueba primero si ya
 * hay algo de ese tipo antes de crear más.
 *
 * Para el proyecto, las tareas y las bajas se reutiliza la capa de
 * servicio (mismas validaciones y efectos secundarios que un uso real:
 * notificaciones, registro de actividad…). Para vacaciones y ausencias
 * pasadas se inserta directamente por repositorio: esos endpoints exigen
 * "hoy o en el futuro" al crear —una regla de negocio real, no un
 * descuido— así que no hay otra forma de dejar historial ya vencido sin
 * saltársela a propósito, solo aquí, solo para tener algo que enseñar en
 * las pantallas de historial.
 */
async function seedDemoData() {
  const [worker, supervisor, admin] = await Promise.all([
    findUserByEmail(WORKER_EMAIL),
    findUserByEmail(SUPERVISOR_EMAIL),
    findUserByEmail(ADMIN_EMAIL),
  ]);

  if (!worker || !supervisor || !admin) {
    throw new Error(
      "Faltan una o más cuentas de demo (worker-demo, supervisor-demo, admin). " +
        "Este script no las crea: solo añade datos a las que ya existen.",
    );
  }

  const project = await ensureProject(supervisor.id);
  await ensureMembership(worker.id, project.id);
  await seedTasks(project.id, supervisor.id, worker.id);
  await seedVacations(worker.id, supervisor.id);
  await seedScheduledAbsences(worker.id);
  await seedLeave(admin.id, worker.id);

  console.log("Datos de demo listos.");
}

async function ensureProject(supervisorId: string) {
  const existing = await listProjectsForSupervisor(supervisorId);
  const active = existing.find((p) => !p.is_archived);
  if (active) {
    console.log(`Proyecto de demo ya existe: "${active.name}".`);
    return active;
  }

  const project = await createProject({
    name: "Portal de clientes",
    description: "Renovación del área privada de clientes: nuevo panel, notificaciones y facturación.",
    supervisorId,
    clientName: "Comercial Delta S.A.",
    clientContact: "Marta Fernández — marta.fernandez@comercialdelta.test",
  });
  console.log(`Proyecto de demo creado: "${project.name}".`);
  return project;
}

async function ensureMembership(workerId: string, projectId: string): Promise<void> {
  const membership = await findActiveMembership(workerId);
  if (membership && membership.project_id === projectId) {
    console.log("El trabajador de demo ya está en el proyecto.");
    return;
  }
  await assignMember(projectId, { userId: workerId });
  console.log("Trabajador de demo incorporado al proyecto.");
}

type TaskSeed = {
  title: string;
  description: string | null;
  dueDateOffset: number | null;
  estimatedHours: number | null;
  status: "pending" | "in_progress" | "done";
  progress: number;
  timeEntries: { amount: number; unit: TimeEntryUnit; description: string }[];
};

const TASK_SEEDS: TaskSeed[] = [
  {
    title: "Diseñar la pantalla de login",
    description: "Wireframes y estilos del nuevo formulario de acceso.",
    dueDateOffset: 2,
    estimatedHours: 6,
    status: "done",
    progress: 100,
    timeEntries: [
      { amount: 3, unit: "hours", description: "Wireframes iniciales" },
      { amount: 2, unit: "hours", description: "Ajustes de estilo tras revisión" },
      { amount: 90, unit: "minutes", description: "Pulido final y revisión de accesibilidad" },
    ],
  },
  {
    title: "Implementar autenticación con JWT",
    description: "Login, refresco de sesión y cierre de sesión desde el frontend.",
    dueDateOffset: 7,
    estimatedHours: 10,
    status: "in_progress",
    progress: 60,
    timeEntries: [{ amount: 4, unit: "hours", description: "Integración del formulario con el endpoint de login" }],
  },
  {
    title: "Escribir tests de integración",
    description: "Cobertura de los flujos de autenticación y fichaje.",
    dueDateOffset: 14,
    estimatedHours: 4,
    status: "pending",
    progress: 0,
    timeEntries: [],
  },
  {
    title: "Revisar accesibilidad del dashboard",
    description: "Contraste, foco de teclado y etiquetas ARIA en los widgets principales.",
    dueDateOffset: 10,
    estimatedHours: null,
    status: "in_progress",
    progress: 30,
    timeEntries: [{ amount: 1, unit: "hours", description: "Auditoría inicial con lector de pantalla" }],
  },
  {
    title: "Documentar la API pública",
    description: null,
    dueDateOffset: null,
    estimatedHours: null,
    status: "pending",
    progress: 0,
    timeEntries: [],
  },
];

async function seedTasks(projectId: string, supervisorId: string, workerId: string): Promise<void> {
  const existing = await listTasksForProject(projectId);
  const existingTitles = new Set(existing.map((t) => t.title));

  for (const seed of TASK_SEEDS) {
    if (existingTitles.has(seed.title)) {
      console.log(`Tarea de demo ya existe: "${seed.title}".`);
      continue;
    }

    const task = await createTask(supervisorId, {
      projectId,
      title: seed.title,
      description: seed.description,
      assigneeId: workerId,
      dueDate: seed.dueDateOffset === null ? null : offsetDate(seed.dueDateOffset),
      estimatedHours: seed.estimatedHours,
    });

    if (seed.status !== "pending") {
      await updateTaskStatus(task.id, workerId, "worker", seed.status);
    }
    if (seed.progress > 0) {
      await updateTaskProgress(task.id, workerId, "worker", seed.progress);
    }
    for (const entry of seed.timeEntries) {
      await logTaskTime(task.id, workerId, "worker", entry);
    }

    console.log(`Tarea de demo creada: "${seed.title}".`);
  }
}

async function seedVacations(workerId: string, supervisorId: string): Promise<void> {
  const existing = await listVacationRequestsForUser(workerId);
  if (existing.length > 0) {
    console.log("Ya hay solicitudes de vacaciones de demo.");
    return;
  }

  // Futuras, por la vía normal (endpoint público): una queda pendiente
  // de decidir, la otra se aprueba, para ver ambos estados en pantalla.
  await createVacationRequest(workerId, { startDate: offsetDate(15), endDate: offsetDate(18) });
  const upcoming = await createVacationRequest(workerId, { startDate: offsetDate(25), endDate: offsetDate(27) });
  await updateVacationStatus(upcoming.id, "approved", supervisorId);

  // Pasadas, insertadas directamente (ver comentario en seedDemoData):
  // una aprobada y otra rechazada, para que el historial no salga vacío.
  const pastApproved = await insertVacationRequest(workerId, offsetDate(-20), offsetDate(-16));
  await updateVacationStatus(pastApproved.id, "approved", supervisorId);
  const pastRejected = await insertVacationRequest(workerId, offsetDate(-40), offsetDate(-38));
  await updateVacationStatus(pastRejected.id, "rejected", supervisorId);

  console.log("Solicitudes de vacaciones de demo creadas.");
}

async function seedScheduledAbsences(workerId: string): Promise<void> {
  const existing = await listScheduledAbsencesForUser(workerId);
  if (existing.length > 0) {
    console.log("Ya hay ausencias puntuales de demo.");
    return;
  }

  await createScheduledAbsence(workerId, {
    date: offsetDate(5),
    startTime: "10:00",
    endTime: "11:00",
    reason: "Cita médica",
  });

  // Pasada, insertada directamente (mismo motivo que en seedVacations).
  await insertScheduledAbsence({
    userId: workerId,
    date: offsetDate(-10),
    startTime: "09:00",
    endTime: "10:30",
    reason: "Gestión con el banco",
  });

  console.log("Ausencias puntuales de demo creadas.");
}

async function seedLeave(adminId: string, workerId: string): Promise<void> {
  const existing = await listLeavesForUser(workerId);
  if (existing.length > 0) {
    console.log("Ya hay una baja de demo.");
    return;
  }

  // A diferencia de vacaciones/ausencias, una baja no exige "hoy o
  // futuro" al darla de alta: se puede registrar tal cual, ya finalizada.
  const type: LeaveType = "sick_leave";
  await createLeave(adminId, "admin", {
    userId: workerId,
    type,
    startDate: offsetDate(-15),
    endDate: offsetDate(-10),
  });

  console.log("Baja de demo creada.");
}

seedDemoData()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end().finally(() => process.exit(1));
  });
