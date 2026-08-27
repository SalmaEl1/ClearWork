import type { TeamMemberSummary } from "@clearwork/shared";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamStatusList } from "../../src/components/TeamStatusList.js";

const createLeave = vi.hoisted(() => vi.fn());
vi.mock("../../src/api/leaves.js", () => ({ createLeave }));

function member(overrides: Partial<TeamMemberSummary> = {}): TeamMemberSummary {
  return {
    id: "u1",
    fullName: "Juan Worker",
    status: "working",
    breakType: null,
    leaveType: null,
    scheduledAbsenceReason: null,
    activeTaskTitle: null,
    hoursThisWeek: 12.5,
    ...overrides,
  };
}

describe("TeamStatusList", () => {
  beforeEach(() => {
    createLeave.mockReset().mockResolvedValue({});
  });

  it("muestra el estado vacío cuando no hay equipo", () => {
    render(<TeamStatusList team={[]} onChanged={vi.fn()} />);
    expect(screen.getByText("Todavía no tienes trabajadores a tu cargo.")).toBeInTheDocument();
  });

  it("muestra 'De baja' con el tipo cuando el estado es on_leave", () => {
    render(
      <TeamStatusList
        team={[member({ status: "on_leave", leaveType: "sick_leave" })]}
        onChanged={vi.fn()}
      />,
    );
    expect(screen.getByText("De baja (Enfermedad)")).toBeInTheDocument();
  });

  it("muestra 'Fuera' con el motivo cuando el estado es on_scheduled_absence", () => {
    render(
      <TeamStatusList
        team={[member({ status: "on_scheduled_absence", scheduledAbsenceReason: "Cita médica" })]}
        onChanged={vi.fn()}
      />,
    );
    expect(screen.getByText("Fuera (Cita médica)")).toBeInTheDocument();
  });

  it("muestra la tarea activa cuando alguien está trabajando en una", () => {
    render(
      <TeamStatusList
        team={[member({ status: "working", activeTaskTitle: "Preparar demo" })]}
        onChanged={vi.fn()}
      />,
    );
    expect(screen.getByText("Trabajando (Preparar demo)")).toBeInTheDocument();
  });

  it("indica que no hay tarea concreta cuando está trabajando sin haber elegido una", () => {
    render(
      <TeamStatusList team={[member({ status: "working", activeTaskTitle: null })]} onChanged={vi.fn()} />,
    );
    expect(screen.getByText("Trabajando (sin tarea concreta)")).toBeInTheDocument();
  });

  it("no ofrece 'Registrar baja' para quien ya está de baja", () => {
    render(
      <TeamStatusList
        team={[member({ status: "on_leave", leaveType: "sick_leave" })]}
        onChanged={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Registrar baja" })).not.toBeInTheDocument();
  });

  it("registra una baja y avisa a onChanged", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<TeamStatusList team={[member()]} onChanged={onChanged} />);

    await user.click(screen.getByRole("button", { name: "Registrar baja" }));
    const dialog = screen.getByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText("Tipo"), "temporary_leave");
    fireEvent.change(within(dialog).getByLabelText("Fecha de inicio"), { target: { value: "2026-03-01" } });
    await user.click(within(dialog).getByRole("button", { name: "Registrar baja" }));

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
});
