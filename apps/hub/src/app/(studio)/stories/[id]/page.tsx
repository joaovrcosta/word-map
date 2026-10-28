"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api, type HubBook, type HubStoryDetail, type HubStoryStep } from "@/lib/api";

type DraftOption = { text: string; correct: boolean };

type Draft = {
  speaker: string;
  text: string;
  translation: string;
  kind: "" | "TRUE_FALSE" | "CHOICE";
  prompt: string;
  correct: boolean;
  options: DraftOption[];
};

const emptyDraft = (): Draft => ({
  speaker: "",
  text: "",
  translation: "",
  kind: "",
  prompt: "",
  correct: true,
  options: [
    { text: "", correct: true },
    { text: "", correct: false },
  ],
});

function draftFromStep(step: HubStoryStep): Draft {
  return {
    speaker: step.speaker ?? "",
    text: step.text,
    translation: step.translation,
    kind: step.challenge?.kind ?? "",
    prompt: step.challenge?.prompt ?? "",
    correct: step.challenge?.correct ?? true,
    options:
      step.challenge?.options.map((option) => ({ text: option.text, correct: option.correct })) ??
      emptyDraft().options,
  };
}

function payload(draft: Draft) {
  const challenge =
    draft.kind === ""
      ? null
      : draft.kind === "TRUE_FALSE"
        ? { kind: draft.kind, prompt: draft.prompt, correct: draft.correct }
        : { kind: draft.kind, prompt: draft.prompt, options: draft.options };
  return {
    speaker: draft.speaker,
    text: draft.text,
    translation: draft.translation,
    challenge,
  };
}

export default function StoryEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const storyId = Number(params.id);
  const [story, setStory] = useState<HubStoryDetail | null>(null);
  const [books, setBooks] = useState<HubBook[]>([]);
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [bookId, setBookId] = useState("");
  const [error, setError] = useState("");
  const [fresh, setFresh] = useState<Draft>(emptyDraft());

  function apply(next: HubStoryDetail) {
    setStory(next);
    setTitle(next.title);
    setTheme(next.theme);
    setBookId(next.bookId == null ? "" : String(next.bookId));
  }

  function load() {
    api<HubStoryDetail>("GET", `/hub/stories/${storyId}`)
      .then(apply)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "História não encontrada"));
  }

  useEffect(load, [storyId]);

  useEffect(() => {
    api<HubBook[]>("GET", "/hub/books")
      .then(setBooks)
      .catch(() => setBooks([]));
  }, []);

  async function saveStory(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const next = await api<HubStoryDetail>("PATCH", `/hub/stories/${storyId}`, {
        title,
        theme,
        bookId: bookId ? Number(bookId) : null,
      });
      apply(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar.");
    }
  }

  async function publish(published: boolean) {
    setError("");
    try {
      apply(await api<HubStoryDetail>("POST", `/hub/stories/${storyId}/publish`, { published }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível publicar.");
    }
  }

  async function remove() {
    if (!confirm("Excluir esta história?")) return;
    await api("DELETE", `/hub/stories/${storyId}`);
    router.push("/stories");
  }

  async function addStep(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      apply(await api<HubStoryDetail>("POST", `/hub/stories/${storyId}/steps`, payload(fresh)));
      setFresh(emptyDraft());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível adicionar a fala.");
    }
  }

  async function saveStep(stepId: number, draft: Draft) {
    setError("");
    try {
      apply(await api<HubStoryDetail>("PATCH", `/hub/steps/${stepId}`, payload(draft)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a fala.");
    }
  }

  async function removeStep(stepId: number) {
    if (!confirm("Excluir esta fala?")) return;
    apply(await api<HubStoryDetail>("DELETE", `/hub/steps/${stepId}`));
  }

  async function move(index: number, direction: -1 | 1) {
    if (!story) return;
    const next = story.steps.slice();
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    apply(
      await api<HubStoryDetail>("POST", `/hub/stories/${storyId}/steps/reorder`, {
        stepIds: next.map((step) => step.id),
      })
    );
  }

  if (!story) {
    return <p className="text-sm text-[#667085]">{error || "Carregando história..."}</p>;
  }

  return (
    <div>
      <Link href="/stories" className="text-sm font-extrabold text-[#14804a]">
        Voltar às histórias
      </Link>
      <form onSubmit={saveStory} className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#98a2b3]">
            {story.publishedAt ? "Publicada" : "Rascunho"}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void publish(!story.publishedAt)}
              className="text-sm font-extrabold text-[#14804a]"
            >
              {story.publishedAt ? "Despublicar" : "Publicar"}
            </button>
            <button type="button" onClick={() => void remove()} className="text-sm font-bold text-[#b42318]">
              Excluir
            </button>
          </div>
        </div>
        <label className="mt-4 block text-sm font-bold" htmlFor="title">
          Título
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />
        <label className="mt-4 block text-sm font-bold" htmlFor="theme">
          Tema
        </label>
        <input
          id="theme"
          required
          value={theme}
          onChange={(event) => setTheme(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />
        <label className="mt-4 block text-sm font-bold" htmlFor="book">
          Livro
        </label>
        <select
          id="book"
          value={bookId}
          onChange={(event) => setBookId(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        >
          <option value="">Sem livro</option>
          {books.map((book) => (
            <option key={book.id} value={book.id}>
              {book.title}
            </option>
          ))}
        </select>
        {error && <p className="mt-3 text-sm text-[#b42318]">{error}</p>}
        <button type="submit" className="mt-4 rounded-xl bg-[#24c875] px-4 py-2 font-extrabold text-white">
          Salvar
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {story.steps.map((step, index) => (
          <StepCard
            key={step.id}
            index={index}
            total={story.steps.length}
            step={step}
            onSave={(draft) => void saveStep(step.id, draft)}
            onRemove={() => void removeStep(step.id)}
            onMove={(direction) => void move(index, direction)}
          />
        ))}
      </div>

      <form onSubmit={addStep} className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="font-extrabold">Nova fala</h2>
        <StepFields draft={fresh} onChange={setFresh} />
        <button type="submit" className="mt-4 rounded-xl bg-[#17202a] px-4 py-2 font-extrabold text-white">
          Adicionar fala
        </button>
      </form>
    </div>
  );
}

function StepCard({
  index,
  total,
  step,
  onSave,
  onRemove,
  onMove,
}: {
  index: number;
  total: number;
  step: HubStoryStep;
  onSave: (draft: Draft) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [draft, setDraft] = useState(() => draftFromStep(step));

  useEffect(() => {
    setDraft(draftFromStep(step));
  }, [step]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
      className="rounded-3xl bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold">Fala {index + 1}</p>
        <div className="flex gap-3 text-sm font-bold">
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="disabled:opacity-30">
            Subir
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="disabled:opacity-30"
          >
            Descer
          </button>
          <button type="button" onClick={onRemove} className="text-[#b42318]">
            Excluir
          </button>
        </div>
      </div>
      <StepFields draft={draft} onChange={setDraft} />
      <button type="submit" className="mt-4 rounded-xl bg-[#24c875] px-4 py-2 font-extrabold text-white">
        Salvar fala
      </button>
    </form>
  );
}

function StepFields({ draft, onChange }: { draft: Draft; onChange: (next: Draft) => void }) {
  function patch(partial: Partial<Draft>) {
    onChange({ ...draft, ...partial });
  }

  return (
    <div>
      <label className="mt-4 block text-sm font-bold">Quem fala</label>
      <input
        value={draft.speaker}
        onChange={(event) => patch({ speaker: event.target.value })}
        placeholder="Opcional"
        className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
      />
      <label className="mt-4 block text-sm font-bold">Texto</label>
      <textarea
        required
        value={draft.text}
        onChange={(event) => patch({ text: event.target.value })}
        className="mt-1 min-h-20 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
      />
      <label className="mt-4 block text-sm font-bold">Tradução</label>
      <textarea
        required
        value={draft.translation}
        onChange={(event) => patch({ translation: event.target.value })}
        className="mt-1 min-h-20 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
      />
      <label className="mt-4 block text-sm font-bold">Exercício</label>
      <select
        value={draft.kind}
        onChange={(event) => patch({ kind: event.target.value as Draft["kind"] })}
        className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
      >
        <option value="">Nenhum</option>
        <option value="TRUE_FALSE">Verdadeiro ou falso</option>
        <option value="CHOICE">Escolha</option>
      </select>
      {draft.kind !== "" && (
        <>
          <label className="mt-4 block text-sm font-bold">Enunciado</label>
          <textarea
            required
            value={draft.prompt}
            onChange={(event) => patch({ prompt: event.target.value })}
            className="mt-1 min-h-16 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
          />
        </>
      )}
      {draft.kind === "TRUE_FALSE" && (
        <label className="mt-3 flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={draft.correct}
            onChange={(event) => patch({ correct: event.target.checked })}
          />
          A afirmação é verdadeira
        </label>
      )}
      {draft.kind === "CHOICE" && (
        <div className="mt-3 space-y-2">
          {draft.options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={option.correct}
                onChange={(event) => {
                  const options = draft.options.slice();
                  options[index] = { ...option, correct: event.target.checked };
                  patch({ options });
                }}
                aria-label="Opção certa"
              />
              <input
                required
                value={option.text}
                onChange={(event) => {
                  const options = draft.options.slice();
                  options[index] = { ...option, text: event.target.value };
                  patch({ options });
                }}
                className="w-full rounded-xl border border-[#d7dde5] px-3 py-2"
              />
              {draft.options.length > 2 && (
                <button
                  type="button"
                  className="text-sm font-bold text-[#b42318]"
                  onClick={() => patch({ options: draft.options.filter((_, item) => item !== index) })}
                >
                  Tirar
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-extrabold text-[#14804a]"
            onClick={() => patch({ options: [...draft.options, { text: "", correct: false }] })}
          >
            Adicionar opção
          </button>
        </div>
      )}
    </div>
  );
}
