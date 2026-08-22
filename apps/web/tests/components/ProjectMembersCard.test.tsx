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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    members: [{ userId: "u1", fullName: "Juan Worker", joinedAt: "2026-01-01T00:00:00.000Z" }],
    ...overrides,
  };
}

const workers = [
  { id: "u1", fullName: "Juan Worker", currentProjectName: "Proyecto Web" },
  { id: "u2", fullName: "María Worker", currentProjectName: null },
  { id: "u3", fullName: "Luis Worker", currentProjectName: "Otro Proyecto" },
];

describe("ProjectMembersCard", () => {
  it("lista los miembros actuales y excluye del desplegable a quien ya está dentro", () => {
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

    const select = screen.getByRole("combobox");
    const options = within(select).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "María Worker (sin proyecto)",
      "Luis Worker (en Otro Proyecto)",
    ]);
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

    await user.selectOptions(screen.getByRole("combobox"), "u3");
    await user.click(screen.getByRole("button", { name: "Asignar" }));

    await waitFor(() => expect(onAssign).toHaveBeenCalledWith("u3"));
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
