import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WeeklyHoursCard } from "../../src/components/WeeklyHoursCard.js";

describe("WeeklyHoursCard", () => {
  it("muestra las horas trabajadas y el objetivo", () => {
    render(<WeeklyHoursCard workedHours={20} targetHours={40} status="ok" />);
    expect(screen.getByText("20.0 h")).toBeInTheDocument();
    expect(screen.getByText("/ 40.0 h objetivo")).toBeInTheDocument();
  });

  it("no muestra aviso cuando el estado es 'ok'", () => {
    render(<WeeklyHoursCard workedHours={20} targetHours={40} status="ok" />);
    expect(screen.queryByText("Dentro de tu objetivo")).not.toBeInTheDocument();
  });

  it("muestra el aviso de 'cerca del objetivo' cuando el estado es 'near_limit'", () => {
    render(<WeeklyHoursCard workedHours={38} targetHours={40} status="near_limit" />);
    expect(screen.getByText("Cerca de tu objetivo semanal")).toBeInTheDocument();
  });

  it("muestra el aviso de 'objetivo superado' cuando el estado es 'over_limit'", () => {
    render(<WeeklyHoursCard workedHours={45} targetHours={40} status="over_limit" />);
    expect(screen.getByText("Has superado tu objetivo semanal")).toBeInTheDocument();
  });

  it("no supera el 100% de la barra de progreso aunque se pasen las horas objetivo", () => {
    const { container } = render(<WeeklyHoursCard workedHours={60} targetHours={40} status="over_limit" />);
    const fill = container.querySelector(".progress-bar__fill") as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });

  it("no divide por cero cuando el objetivo es 0", () => {
    const { container } = render(<WeeklyHoursCard workedHours={5} targetHours={0} status="ok" />);
    const fill = container.querySelector(".progress-bar__fill") as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });
});
