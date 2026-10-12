import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReadingWordPanel, readingWordMark } from "../reading-word-panel";
import { resetContextualizeClient } from "@/lib/contextualize-client";
import { getPassageExplanation } from "@/actions/passage-explanations";

jest.mock("@/lib/translate", () => ({
  translateDefinitions: jest.fn(async (values: string[]) => values),
}));

jest.mock("@/actions/passage-explanations", () => ({
  getPassageExplanation: jest.fn(async () => null),
}));

const payload = {
  span: "save",
  sentence: "save upon those occasions.",
  paragraph: "Mr. Holmes was late, save upon those occasions.",
  previousParagraph: null,
};

const selected = {
  surface: "save",
  clean: "save",
};

function renderPanel(showContextualize: boolean) {
  return render(
    <ReadingWordPanel
      selected={selected}
      sourceText={payload.paragraph}
      userVaults={[]}
      showContextualize={showContextualize}
      contextPayload={showContextualize ? payload : null}
      onClose={() => undefined}
      onSave={() => undefined}
      onUpdate={() => undefined}
      onRemove={() => undefined}
    />
  );
}

describe("readingWordMark", () => {
  it("deixa forte só a ocorrência clicada", () => {
    const selected = { clean: "holmes", occurrence: 1 };
    expect(readingWordMark(selected, "holmes", 1)).toBe("selected");
    expect(readingWordMark(selected, "holmes", 0)).toBe("similar");
    expect(readingWordMark(selected, "watson", 0)).toBeNull();
  });
});

describe("ReadingWordPanel contextualize", () => {
  beforeEach(() => {
    resetContextualizeClient();
    global.fetch = jest.fn();
    (getPassageExplanation as jest.Mock).mockResolvedValue(null);
  });

  it("mostra a explicação salva só para a frase deste trecho", async () => {
    (getPassageExplanation as jest.Mock).mockResolvedValue(
      "Aqui save significa exceto."
    );
    renderPanel(true);
    expect(
      await screen.findByText("Aqui save significa exceto.")
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("não mostra o botão fora da leitura paginada", () => {
    renderPanel(false);
    expect(screen.queryByRole("button", { name: "Explicar contexto" })).toBeNull();
  });

  it("explica no clique e reaproveita o request em andamento", async () => {
    let resolveFetch: (value: Response) => void = () => undefined;
    const fetchMock = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    renderPanel(true);
    const button = screen.getByRole("button", { name: "Explicar contexto" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch({
      ok: true,
      json: async () => ({ explanation: "Aqui save significa exceto." }),
    } as Response);

    expect(await screen.findByText("Aqui save significa exceto.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Explicar contexto" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
