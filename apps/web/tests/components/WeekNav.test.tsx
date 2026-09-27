import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WeekNav } from "../../src/components/WeekNav.js";

describe("WeekNav", () => {
  it("muestra '…' cuando no se pasan las fechas de la semana", () => {
    render(<WeekNav weekOffset={0} onChange={vi.fn()} />);
    expect(screen.getByText(/…/)).toBeInTheDocument();
  });

  it("formatea el rango de la semana y marca la semana actual", () => {
    render(
      <WeekNav weekOffset={0} onChange={vi.fn()} weekStart="2026-03-02T00:00:00.000Z" weekEnd="2026-03-09T00:00:00.000Z" />,
    );
    expect(screen.getByText(/2 mar.*8 mar/)).toBeInTheDocument();
    expect(screen.getByText(/\(actual\)/)).toBeInTheDocument();
  });

  it("no marca '(actual)' en una semana pasada", () => {
    render(
      <WeekNav weekOffset={-1} onChange={vi.fn()} weekStart="2026-02-23T00:00:00.000Z" weekEnd="2026-03-02T00:00:00.000Z" />,
    );
    expect(screen.queryByText(/\(actual\)/)).not.toBeInTheDocument();
  });

  it("al pulsar 'Semana anterior' llama a onChange con offset - 1", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WeekNav weekOffset={-1} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "← Semana anterior" }));
    expect(onChange).toHaveBeenCalledWith(-2);
  });

  it("al pulsar 'Semana siguiente' llama a onChange con offset + 1", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WeekNav weekOffset={-1} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Semana siguiente →" }));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("deshabilita 'Semana siguiente' cuando ya está en la semana actual", () => {
    render(<WeekNav weekOffset={0} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Semana siguiente →" })).toBeDisabled();
  });
});
