import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  IconActivity,
  IconCalendar,
  IconClock,
  IconDashboard,
  IconDocument,
  IconFolder,
  IconHistory,
  IconMemberChange,
  IconSeat,
  IconSettings,
  IconTasks,
  IconUsers,
} from "../../src/components/NavIcons.js";

const icons = [
  IconDashboard,
  IconUsers,
  IconFolder,
  IconActivity,
  IconSettings,
  IconTasks,
  IconCalendar,
  IconMemberChange,
  IconClock,
  IconHistory,
  IconSeat,
  IconDocument,
];

describe("NavIcons", () => {
  it("cada icono pinta un <svg> decorativo que hereda el color del texto", () => {
    for (const Icon of icons) {
      const { container, unmount } = render(<Icon />);
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("stroke", "currentColor");
      expect(svg!.getAttribute("viewBox")).toBe("0 0 24 24");
      unmount();
    }
  });

  it("reenvía props al <svg> (p. ej. una clase o un tamaño distinto)", () => {
    const { container } = render(<IconDashboard className="nav-icon" width={24} />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveClass("nav-icon");
    expect(svg).toHaveAttribute("width", "24");
  });
});
