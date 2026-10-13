import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "../use-debounce";

describe("useDebounce", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("deve retornar o valor inicial imediatamente", () => {
    const { result } = renderHook(() => useDebounce("initial", 500));

    expect(result.current).toBe("initial");
  });

  it("deve debounce mudanças de valor", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "initial", delay: 500 },
      }
    );

    expect(result.current).toBe("initial");

    // Mudar o valor
    rerender({ value: "updated", delay: 500 });
    expect(result.current).toBe("initial"); // Ainda deve ser o valor anterior

    // Avançar o timer
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe("updated");
  });

  it("deve cancelar timer anterior quando valor muda rapidamente", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "initial", delay: 500 },
      }
    );

    expect(result.current).toBe("initial");

    // Mudar valor rapidamente
    rerender({ value: "first", delay: 500 });
    rerender({ value: "second", delay: 500 });
    rerender({ value: "final", delay: 500 });

    expect(result.current).toBe("initial");

    // Avançar o timer
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe("final");
  });

  it("deve funcionar com diferentes tipos de dados", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 0, delay: 300 },
      }
    );

    expect(result.current).toBe(0);

    rerender({ value: 42, delay: 300 });
    expect(result.current).toBe(0);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe(42);
  });

  it("deve funcionar com objetos", () => {
    const initialObject = { name: "initial", count: 0 };
    const updatedObject = { name: "updated", count: 1 };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialObject, delay: 200 },
      }
    );

    expect(result.current).toBe(initialObject);

    rerender({ value: updatedObject, delay: 200 });
    expect(result.current).toBe(initialObject);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe(updatedObject);
  });

  it("deve funcionar com arrays", () => {
    const initialArray = [1, 2, 3];
    const updatedArray = [4, 5, 6];

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialArray, delay: 100 },
      }
    );

    expect(result.current).toBe(initialArray);

    rerender({ value: updatedArray, delay: 100 });
    expect(result.current).toBe(initialArray);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe(updatedArray);
  });

  it("deve limpar timer quando componente é desmontado", () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "initial", delay: 1000 },
      }
    );

    rerender({ value: "updated", delay: 1000 });
    expect(result.current).toBe("initial");

    // Desmontar componente
    unmount();

    // Avançar o timer após desmontagem
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Não deve haver erro ou vazamento de memória
  });

  it("deve atualizar delay quando delay muda", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "initial", delay: 500 },
      }
    );

    expect(result.current).toBe("initial");

    // Mudar valor e delay
    rerender({ value: "updated", delay: 200 });
    expect(result.current).toBe("initial");

    // Avançar com o novo delay
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe("updated");
  });

  it("deve funcionar com delay zero", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "initial", delay: 0 },
      }
    );

    expect(result.current).toBe("initial");

    rerender({ value: "updated", delay: 0 });

    // Com delay zero, deve atualizar imediatamente
    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current).toBe("updated");
  });
});
