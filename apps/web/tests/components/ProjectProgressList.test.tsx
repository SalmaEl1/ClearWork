import type { ProjectTaskSummary } from "@clearwork/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectProgressList } from "../../src/components/ProjectProgressList.js";

function project(overrides: Partial<ProjectTaskSummary> = {}): ProjectTaskSummary {
  return {
    projectId: "p1",
    projectName: "Web",
    pending: 1,
    inProgress: 2,
    done: 3,
    ...overrides,
  };
}

describe("ProjectProgressList", () => {
  it("muestra el estado vacío cuando no hay proyectos", () => {
    render(<ProjectProgressList projects={[]} />);
    expect(screen.getByText("Todavía no has creado ningún proyecto.")).toBeInTheDocument();
  });

  it("muestra el nombre del proyecto y el total de tareas", () => {
    render(<ProjectProgressList projects={[project()]} />);
    expect(screen.getByText("Web")).toBeInTheDocument();
    expect(screen.getByText("6 tareas")).toBeInTheDocument();
  });

  it("muestra la leyenda con el desglose por estado", () => {
    render(<ProjectProgressList projects={[project()]} />);
    expect(screen.getByText("Pendiente: 1")).toBeInTheDocument();
    expect(screen.getByText("En progreso: 2")).toBeInTheDocument();
    expect(screen.getByText("Completada: 3")).toBeInTheDocument();
  });

  it("no muestra la barra de progreso cuando el proyecto no tiene tareas", () => {
    const { container } = render(<ProjectProgressList projects={[project({ pending: 0, inProgress: 0, done: 0 })]} />);
    expect(container.querySelector(".progress-bar--stacked")).not.toBeInTheDocument();
  });

  it("muestra una barra de progreso por cada proyecto con tareas", () => {
    const { container } = render(
      <ProjectProgressList
        projects={[project({ projectId: "p1" }), project({ projectId: "p2", projectName: "App" })]}
      />,
    );
    expect(container.querySelectorAll(".progress-bar--stacked")).toHaveLength(2);
    expect(screen.getByText("App")).toBeInTheDocument();
  });
});
