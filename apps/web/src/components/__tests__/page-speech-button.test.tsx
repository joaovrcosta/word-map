import { act, fireEvent, render, screen } from "@testing-library/react";
import { PageSpeechButton } from "../page-speech-button";

class MockUtterance {
  lang = "";
  rate = 1;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}

describe("PageSpeechButton", () => {
  const spoken: MockUtterance[] = [];
  const speak = jest.fn((utterance: MockUtterance) => {
    spoken.push(utterance);
  });
  const cancel = jest.fn();

  beforeEach(() => {
    spoken.length = 0;
    speak.mockClear();
    cancel.mockClear();
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { speak, cancel },
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: MockUtterance,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("lê a página frase a frase e pausa sem avançar", () => {
    jest.useFakeTimers();
    render(<PageSpeechButton text="Hello there. Second sentence." />);

    fireEvent.click(screen.getByRole("button", { name: "Ouvir esta página" }));
    act(() => {
      jest.advanceTimersByTime(60);
    });

    expect(speak).toHaveBeenCalledTimes(1);
    expect(spoken[0]?.text).toMatch(/Hello there/);
    expect(screen.getByRole("button", { name: "Pausar leitura" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pausar leitura" }));
    expect(cancel).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Ouvir esta página" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pausar leitura" })).not.toBeInTheDocument();

    spoken[0]?.onend?.();
    expect(speak).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Ouvir esta página" }));
    act(() => {
      jest.advanceTimersByTime(60);
    });
    expect(spoken.at(-1)?.text).toMatch(/Hello there/);

    act(() => {
      spoken.at(-1)?.onend?.();
    });
    expect(spoken.at(-1)?.text).toMatch(/Second sentence/);
  });

  it("avança para a frase seguinte enquanto lê", () => {
    jest.useFakeTimers();
    render(<PageSpeechButton text="Hello there. Second sentence." />);

    fireEvent.click(screen.getByRole("button", { name: "Ouvir esta página" }));
    act(() => {
      jest.advanceTimersByTime(60);
    });

    fireEvent.click(screen.getByRole("button", { name: "Próxima parte" }));
    act(() => {
      jest.advanceTimersByTime(60);
    });

    expect(spoken.at(-1)?.text).toMatch(/Second sentence/);
    expect(screen.getByRole("button", { name: "Pausar leitura" })).toBeInTheDocument();
  });

  it("retoma da palavra em que pausou", () => {
    jest.useFakeTimers();
    render(<PageSpeechButton text="Hello there. Second sentence." />);

    fireEvent.click(screen.getByRole("button", { name: "Ouvir esta página" }));
    act(() => {
      jest.advanceTimersByTime(60);
    });
    act(() => {
      jest.advanceTimersByTime(600);
    });

    fireEvent.click(screen.getByRole("button", { name: "Pausar leitura" }));
    fireEvent.click(screen.getByRole("button", { name: "Ouvir esta página" }));
    act(() => {
      jest.advanceTimersByTime(60);
    });

    expect(spoken.at(-1)?.text.startsWith("there")).toBe(true);
  });
});
