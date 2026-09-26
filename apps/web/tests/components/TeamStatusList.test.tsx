import type { TeamMemberSummary } from "@clearwork/shared";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamStatusList } from "../../src/components/TeamStatusList.js";

const createLeave = vi.hoisted(() => vi.fn());
const endLeave = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/leaves.js", () => ({ createLeave, endLeave }));

function member(overrides: Partial<TeamMemberSummary> = {}): TeamMemberSummary {
  return {
    id: "u1",
    fullName: "Juan Worker",
    status: "working",
    breakType: null,
    leaveType: null,
    leaveId: null,
    scheduledAbsenceReason: null,
    hoursThisWeek: 12.5,
    vacationBalance: { year: 2026, total: 23, used: 0, remaining: 23 },
    ...overrides,
  };
}

function renderList(team: TeamMemberSummary[], onChanged = vi.fn()) {
  return render(
    <MemoryRouter>
      <TeamStatusList team={team} onChanged={onChanged} />
    </MemoryRouter>,
  );
}

describe("TeamStatusList", () => {
  beforeEach(() => {
    createLeave.mockReset().mockResolvedValue({});
    endLeave.mockReset().mockResolvedValue({});
  });

  it("muestra el estado vacío cuando no hay equipo", () => {
    renderList([]);
    expect(screen.getByText("Todavía no tienes trabajadores a tu cargo.")).toBeInTheDocument();
  });

  it("muestra 'De baja/permiso' con el tipo cuando el estado es on_leave", () => {
    renderList([member({ status: "on_leave", leaveType: "sick_leave" })]);
    expect(screen.getByText("De baja/permiso (Enfermedad)")).toBeInTheDocument();
  });

  it("muestra 'Fuera' con el motivo cuando el estado es on_scheduled_absence", () => {
    renderList([member({ status: "on_scheduled_absence", scheduledAbsenceReason: "Cita médica" })]);
    expect(screen.getByText("Fuera (Cita médica)")).toBeInTheDocument();
  });

  it("no ofrece 'Registrar baja/permiso' para quien ya está de baja/permiso", () => {
    renderList([member({ status: "on_leave", leaveType: "sick_leave" })]);
    expect(screen.queryByRole("button", { name: "Registrar baja/permiso" })).not.toBeInTheDocument();
  });

  it("enlaza al historial de fichajes de cada miembro", () => {
    renderList([member()]);
    expect(screen.getByRole("link", { name: "Ver historial →" })).toHaveAttribute(
      "href",
      "/supervisor/team/u1/history",
    );
  });

  it("registra una baja/permiso y avisa a onChanged", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    renderList([member()], onChanged);

    await user.click(screen.getByRole("button", { name: "Registrar baja/permiso" }));
    const dialog = screen.getByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText("Tipo"), "temporary_leave");
    fireEvent.change(within(dialog).getByLabelText("Fecha de inicio"), { target: { value: "2026-03-01" } });
    await user.click(within(dialog).getByRole("button", { name: "Registrar baja/permiso" }));

    await waitFor(() =>
      expect(createLeave).toHaveBeenCalledWith({
        userId: "u1",
        type: "temporary_leave",
        startDate: "2026-03-01",
        endDate: null,
      }),
    );
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("ofrece 'Finalizar baja/permiso' en vez de 'Registrar baja/permiso' para quien ya está de baja/permiso", () => {
    renderList([member({ status: "on_leave", leaveType: "sick_leave", leaveId: "l1" })]);
    expect(screen.getByRole("button", { name: "Finalizar baja/permiso" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar baja/permiso" })).not.toBeInTheDocument();
  });

  it("finaliza una baja/permiso tras confirmar, y avisa a onChanged", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    renderList([member({ status: "on_leave", leaveType: "sick_leave", leaveId: "l1" })], onChanged);

    await user.click(screen.getByRole("button", { name: "Finalizar baja/permiso" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Finalizar" }));

    await waitFor(() => expect(endLeave).toHaveBeenCalledWith("l1"));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("muestra el saldo de vacaciones de cada persona", () => {
    renderList([member({ vacationBalance: { year: 2026, total: 12, used: 4, remaining: 8 } })]);
    expect(screen.getByText("Vacaciones 2026: 8/12 días")).toBeInTheDocument();
  });
});
