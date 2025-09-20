import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../button";

describe("Button Component", () => {
  it("deve renderizar botão com texto", () => {
    render(<Button>Clique aqui</Button>);

    const button = screen.getByRole("button", { name: "Clique aqui" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Clique aqui");
  });

  it("deve aplicar variante padrão", () => {
    render(<Button>Botão</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-[#1cb0f6]", "text-white", "rounded-full");
  });

  it("deve aplicar variante destructive", () => {
    render(<Button variant="destructive">Deletar</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-red-500", "text-white", "rounded-full");
  });

  it("deve aplicar variante outline", () => {
    render(<Button variant="outline">Outline</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass(
      "border-2",
      "border-[#1cb0f6]",
      "bg-transparent",
      "rounded-full"
    );
  });

  it("deve aplicar variante secondary", () => {
    render(<Button variant="secondary">Secondary</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-gray-100", "text-gray-700", "rounded-full");
  });

  it("deve aplicar variante ghost", () => {
    render(<Button variant="ghost">Ghost</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass(
      "text-gray-600",
      "rounded-full",
      "hover:bg-gray-100"
    );
  });

  it("deve aplicar variante link", () => {
    render(<Button variant="link">Link</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass(
      "text-[#1cb0f6]",
      "underline-offset-4",
      "rounded-none"
    );
  });

  it("deve aplicar tamanho padrão", () => {
    render(<Button>Botão</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-12", "px-6", "py-3");
  });

  it("deve aplicar tamanho sm", () => {
    render(<Button size="sm">Botão Pequeno</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-10", "px-4", "py-2");
  });

  it("deve aplicar tamanho lg", () => {
    render(<Button size="lg">Botão Grande</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-14", "px-8", "py-4");
  });

  it("deve aplicar tamanho icon", () => {
    render(<Button size="icon">🔍</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("size-12", "rounded-full");
  });

  it("deve aplicar classes customizadas", () => {
    render(<Button className="custom-class">Botão</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("deve ser desabilitado quando disabled", () => {
    render(<Button disabled>Botão Desabilitado</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveClass(
      "disabled:pointer-events-none",
      "disabled:opacity-50"
    );
  });

  it("deve chamar onClick quando clicado", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Clique</Button>);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("deve não chamar onClick quando desabilitado", () => {
    const handleClick = jest.fn();
    render(
      <Button disabled onClick={handleClick}>
        Desabilitado
      </Button>
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("deve renderizar como elemento customizado quando asChild", () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>
    );

    const link = screen.getByRole("link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
    expect(link).toHaveAttribute("data-slot", "button");
  });

  it("deve passar props adicionais", () => {
    render(
      <Button data-testid="custom-button" aria-label="Botão customizado">
        Botão
      </Button>
    );

    const button = screen.getByTestId("custom-button");
    expect(button).toHaveAttribute("aria-label", "Botão customizado");
  });

  it("deve combinar múltiplas variantes e tamanhos", () => {
    render(
      <Button variant="destructive" size="lg" className="extra-class">
        Botão Grande Destrutivo
      </Button>
    );

    const button = screen.getByRole("button");
    expect(button).toHaveClass(
      "bg-red-500",
      "text-white",
      "h-14",
      "px-8",
      "extra-class"
    );
  });

  it("deve renderizar com ícone", () => {
    render(
      <Button>
        <span>🔍</span>
        Buscar
      </Button>
    );

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("🔍");
    expect(button).toHaveTextContent("Buscar");
  });

  it("deve ter foco visível", () => {
    render(<Button>Botão</Button>);

    const button = screen.getByRole("button");
    button.focus();

    expect(button).toHaveClass(
      "focus-visible:ring-2",
      "focus-visible:ring-offset-2"
    );
  });

  it("deve ter transições suaves", () => {
    render(<Button>Botão</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("transition-all");
  });
});
