import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "../../src/components/Pagination.js";

describe("Pagination", () => {
  it("no muestra nada cuando la lista está vacía", () => {
    const { container } = render(
      <Pagination page={1} pageSize={10} total={0} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("se muestra aunque todo quepa en una sola página, para poder elegir el tamaño igualmente", () => {
    render(<Pagination page={1} pageSize={10} total={5} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);
    expect(screen.getByText("Página 1 de 1 · 5 en total")).toBeInTheDocument();
    expect(screen.getByLabelText("Elementos por página")).toBeInTheDocument();
  });

  it("deshabilita 'Anterior' en la primera página y 'Siguiente' en la última", () => {
    render(<Pagination page={1} pageSize={10} total={25} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "← Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente →" })).not.toBeDisabled();
  });

  it("avisa con la página siguiente o anterior al pulsar los botones", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={2} pageSize={10} total={25} onPageChange={onPageChange} onPageSizeChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Siguiente →" }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole("button", { name: "← Anterior" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("avisa con el tamaño nuevo al cambiar el selector", async () => {
    const user = userEvent.setup();
    const onPageSizeChange = vi.fn();
    render(<Pagination page={1} pageSize={10} total={100} onPageChange={vi.fn()} onPageSizeChange={onPageSizeChange} />);

    await user.selectOptions(screen.getByLabelText("Elementos por página"), "50");
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it("incluye el tamaño actual entre las opciones aunque no sea uno de los habituales", () => {
    render(<Pagination page={1} pageSize={30} total={100} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);
    expect(screen.getByLabelText("Elementos por página")).toHaveValue("30");
  });
});
