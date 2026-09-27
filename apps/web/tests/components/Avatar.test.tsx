import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "../../src/components/Avatar.js";

describe("Avatar", () => {
  it("muestra las iniciales de nombre y apellido", () => {
    render(<Avatar fullName="Juan Worker" />);
    expect(screen.getByText("JW")).toBeInTheDocument();
  });

  it("usa solo la primera letra cuando el nombre no tiene apellido", () => {
    render(<Avatar fullName="Juan" />);
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("usa la primera y la última palabra cuando hay varios nombres", () => {
    render(<Avatar fullName="Juan Carlos Worker" />);
    expect(screen.getByText("JW")).toBeInTheDocument();
  });

  it("muestra '?' cuando el nombre está vacío", () => {
    render(<Avatar fullName="   " />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("usa el tamaño 'md' por defecto", () => {
    render(<Avatar fullName="Juan Worker" />);
    expect(screen.getByText("JW")).toHaveClass("avatar--md");
  });

  it("aplica el tamaño indicado", () => {
    render(<Avatar fullName="Juan Worker" size="sm" />);
    expect(screen.getByText("JW")).toHaveClass("avatar--sm");
  });
});
