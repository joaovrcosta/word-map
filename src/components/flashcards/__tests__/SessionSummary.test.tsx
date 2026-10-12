import { render, screen } from "@testing-library/react";
import { SessionSummary } from "../SessionSummary";
import type { FlashcardSession } from "@/actions/flashcards";

const session: FlashcardSession = {
  id: "s1",
  vaultId: 4,
  vaultName: "Vocabulario Teste",
  totalWords: 2,
  wordsToReview: 2,
  newWords: 0,
  completedWords: 2,
  startTime: new Date("2026-10-12T18:00:00Z"),
  endTime: new Date("2026-10-12T18:01:00Z"),
};

describe("SessionSummary", () => {
  it("mostra o skeleton enquanto o feedback carrega", () => {
    render(
      <SessionSummary
        session={session}
        challengeCorrect={0}
        challengeTotal={1}
        analysisState="loading"
        onRestartSession={() => undefined}
      />
    );
    expect(
      screen.getByText("Carregando o feedback da sessão")
    ).toBeInTheDocument();
    expect(screen.queryByText(/Treine a palavra/)).toBeNull();
  });

  it("mostra o texto quando o feedback fica pronto", () => {
    render(
      <SessionSummary
        session={session}
        analysis="No completar a frase, você não soube asked (perguntou)."
        analysisState="ready"
        onRestartSession={() => undefined}
      />
    );
    expect(
      screen.getByText(
        "No completar a frase, você não soube asked (perguntou)."
      )
    ).toBeInTheDocument();
  });
});
