import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatTile } from "../../src/components/StatTile.js";

describe("StatTile", () => {
  it("muestra la etiqueta y el valor", () => {
    render(<StatTile label="Horas" value={12} />);
    expect(screen.getByText("Horas")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
