import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  ReadingWordPanel,
  clampReadingPanelWidth,
  readingWordMark,
} from "../reading-word-panel";
import { resetContextualizeClient } from "@/lib/contextualize-client";
import { getPassageExplanation } from "@/actions/passage-explanations";
import { listWordOrigins } from "@/actions/word-origins";

jest.mock("@/lib/translate", () => ({
  translateDefinitions: jest.fn(async (values: string[]) => values),
}));

jest.mock("@/actions/passage-explanations", () => ({
  getPassageExplanation: jest.fn(async () => null),
}));

jest.mock("@/actions/word-origins", () => ({
  listWordOrigins: jest.fn(async () => []),
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

describe("clampReadingPanelWidth", () => {
  it("mantém a largura entre o mínimo e o máximo da tela", () => {
    expect(clampReadingPanelWidth(300, 1280)).toBe(300);
    expect(clampReadingPanelWidth(120, 1280)).toBe(260);
    expect(clampReadingPanelWidth(900, 1280)).toBe(640);
    expect(clampReadingPanelWidth(500, 800)).toBe(440);
  });
});

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
    (getPassageExplanation as jest.Mock).mockResolvedValue({
      explanation: "Aqui save significa exceto.",
      translation: "exceto",
    });
    renderPanel(true);
    expect(
      await screen.findByText("Aqui save significa exceto.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("button", { name: "Salva" })).toBeDisabled();
    expect(screen.getByLabelText("Remover exceto")).toBeInTheDocument();
  });

  it("preenche o campo com a tradução sugerida", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ translation: "recado" }),
    })) as unknown as typeof fetch;

    renderPanel(false);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Sugerir tradução" })[0]
    );

    expect(await screen.findAllByDisplayValue("recado")).toHaveLength(2);
    const buttons = screen.getAllByRole("button", { name: "Sugerir tradução" });
    expect(buttons.every((button) => button.hasAttribute("disabled"))).toBe(true);

    fireEvent.click(buttons[0]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("mostra de onde a palavra veio e o significado daquele momento", async () => {
    (listWordOrigins as jest.Mock).mockResolvedValueOnce([
      {
        id: 1,
        meaning: "perguntou",
        sentence: "He asked a question.",
        sourceTitle: "O Pequeno Príncipe · Capítulo 1",
        sourceKind: "book",
        createdAt: "2026-10-12T15:00:00.000Z",
      },
      {
        id: 2,
        meaning: "pediu",
        sentence: "She asked for water.",
        sourceTitle: "Texto livre",
        sourceKind: "text",
        createdAt: "2026-10-12T18:00:00.000Z",
      },
    ]);

    render(
      <ReadingWordPanel
        selected={{
          surface: "asked",
          clean: "asked",
          saved: {
            id: 9,
            name: "asked",
            vaultId: 4,
            vaultName: "Vocabulario",
            translations: ["perguntou", "pediu"],
            grammaticalClass: "verb",
            confidence: 2,
            notes: null,
          },
        }}
        sourceText=""
        userVaults={[]}
        onClose={() => undefined}
        onSave={() => undefined}
        onUpdate={() => undefined}
        onRemove={() => undefined}
      />
    );

    expect(await screen.findByText("He asked a question.")).toBeInTheDocument();
    expect(screen.getByText("She asked for water.")).toBeInTheDocument();
    expect(screen.getByText("Significado: perguntou")).toBeInTheDocument();
    expect(screen.getByText("Significado: pediu")).toBeInTheDocument();
    expect(
      screen.getByText(/O Pequeno Príncipe · Capítulo 1/)
    ).toBeInTheDocument();
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
      json: async () => ({
        explanation: "Aqui save significa exceto.",
        translation: "exceto",
      }),
    } as Response);

    expect(await screen.findByText("Aqui save significa exceto.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Explicar contexto" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
