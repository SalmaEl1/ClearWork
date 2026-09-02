import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MiniCalendar } from "../../src/components/MiniCalendar.js";

function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

describe("MiniCalendar", () => {
  it("muestra el mes y año en curso", () => {
    render(<MiniCalendar selectedDates={new Set()} onToggleDate={vi.fn()} />);
    const now = new Date();
    const label = now.toLocaleDateString("es-ES", { month: "long" });
    expect(screen.getByText(new RegExp(label, "i"))).toBeInTheDocument();
  });

  it("deshabilita los días ya pasados", () => {
    render(<MiniCalendar selectedDates={new Set()} onToggleDate={vi.fn()} />);
    const now = new Date();
    if (now.getDate() > 1) {
      const yesterday = String(now.getDate() - 1);
      expect(screen.getByRole("button", { name: yesterday })).toBeDisabled();
    }
  });

  it("marca el día de hoy como seleccionable, y avisa al pulsarlo", async () => {
    const user = userEvent.setup();
    const onToggleDate = vi.fn();
    render(<MiniCalendar selectedDates={new Set()} onToggleDate={onToggleDate} />);

    const now = new Date();
    const todayButton = screen.getByRole("button", { name: String(now.getDate()) });
    expect(todayButton).not.toBeDisabled();

    await user.click(todayButton);
    expect(onToggleDate).toHaveBeenCalledWith(todayDateString());
  });

  it("marca como seleccionado un día que ya está en selectedDates", () => {
    const today = todayDateString();
    render(<MiniCalendar selectedDates={new Set([today])} onToggleDate={vi.fn()} />);
    const now = new Date();
    const todayButton = screen.getByRole("button", { name: String(now.getDate()) });
    expect(todayButton).toHaveAttribute("aria-pressed", "true");
  });

  it("no deja navegar antes de enero ni después de diciembre del año en curso", async () => {
    const user = userEvent.setup();
    render(<MiniCalendar selectedDates={new Set()} onToggleDate={vi.fn()} />);

    const now = new Date();
    // Ir a enero
    for (let i = 0; i < now.getMonth(); i++) {
      await user.click(screen.getByRole("button", { name: "Mes anterior" }));
    }
    expect(screen.getByRole("button", { name: "Mes anterior" })).toBeDisabled();

    // Ir a diciembre
    for (let i = 0; i < 11; i++) {
      await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    }
    expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeDisabled();
  });
});
