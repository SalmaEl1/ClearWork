import type { ProjectDetailDTO } from "@clearwork/shared";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client.js";
import { ProjectMembersCard } from "../../src/components/ProjectMembersCard.js";

function makeProject(overrides: Partial<ProjectDetailDTO> = {}): ProjectDetailDTO {
  return {
    id: "p1",
    name: "Proyecto Web",
    description: null,
    supervisorId: "s1",
    supervisorName: "Ana",
    isArchived: false,
    clientName: "Acme S.L.",
    clientContact: "contacto@acme.test",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    members: [{ userId: "u1", fullName: "Juan Worker", joinedAt: "2026-01-01T00:00:00.000Z" }],
    ...overrides,
  };
}

const workers = [
  { id: "u1", fullName: "Juan Worker", currentProjectId: "p1" },
  { id: "u2", fullName: "María Worker", currentProjectId: null },
  { id: "u3", fullName: "Luis Worker", currentProjectId: "p2" },
];

describe("ProjectMembersCard", () => {
  it("lista los miembros actuales y en el desplegable solo ofrece trabajadores sin proyecto", () => {
    render(
      <ProjectMembersCard
        project={makeProject()}
        workers={workers}
        onAssign={vi.fn()}
        onRemove={vi.fn()}
        onChanged={vi.fn()}
      />,
    );

    expect(screen.getByText("Miembros (1)")).toBeInTheDocument();
    expect(screen.getByText("Juan Worker")).toBeInTheDocument();

    // u1 ya es miembro de este proyecto y u3 está en otro: ninguno de los
    // dos debe aparecer como opción, solo u2 (sin proyecto).
    const select = screen.getByRole("combobox");
    const options = within(select).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["María Worker"]);
  });

  it("muestra el estado vacío cuando el proyecto no tiene miembros", () => {
    render(
      <ProjectMembersCard
        project={makeProject({ members: [] })}
        workers={workers}
        onAssign={vi.fn()}
        onRemove={vi.fn()}
        onChanged={vi.fn()}
      />,
    );

    expect(screen.getByText("Todavía no hay trabajadores en este proyecto.")).toBeInTheDocument();
  });

  it("asigna al trabajador seleccionado y refresca al terminar", async () => {
    const user = userEvent.setup();
    const onAssign = vi.fn().mockResolvedValue(undefined);
    const onChanged = vi.fn();

    render(
      <ProjectMembersCard project={makeProject()} workers={workers} onAssign={onAssign} onRemove={vi.fn()} onChanged={onChanged} />,
    );

    await user.selectOptions(screen.getByRole("combobox"), "u2");
    await user.click(screen.getByRole("button", { name: "Asignar" }));

    await waitFor(() => expect(onAssign).toHaveBeenCalledWith("u2"));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("quita a un miembro al pulsar 'Quitar del proyecto'", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn().mockResolvedValue(undefined);
    const onChanged = vi.fn();

    render(
      <ProjectMembersCard project={makeProject()} workers={workers} onAssign={vi.fn()} onRemove={onRemove} onChanged={onChanged} />,
    );

    await user.click(screen.getByRole("button", { name: "Quitar del proyecto" }));

    await waitFor(() => expect(onRemove).toHaveBeenCalledWith("u1"));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("muestra el mensaje de la API cuando falla la asignación, sin llamar a onChanged", async () => {
    const user = userEvent.setup();
    const onAssign = vi.fn().mockRejectedValue(new ApiError("Ese proyecto ya está lleno", 409));
    const onChanged = vi.fn();

    render(
      <ProjectMembersCard project={makeProject()} workers={workers} onAssign={onAssign} onRemove={vi.fn()} onChanged={onChanged} />,
    );

    await user.selectOptions(screen.getByRole("combobox"), "u2");
    await user.click(screen.getByRole("button", { name: "Asignar" }));

    expect(await screen.findByText("Ese proyecto ya está lleno")).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });
});
