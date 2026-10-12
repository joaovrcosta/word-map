export type ContextualizePayload = {
  span: string;
  sentence: string;
  paragraph: string;
  previousParagraph?: string | null;
  wordId?: number;
};

export type ContextualizeResult = {
  explanation: string;
  translation: string | null;
};

const sessionCache = new Map<string, ContextualizeResult>();
const inflight = new Map<string, Promise<ContextualizeResult>>();

export function contextualizeSessionKey(span: string, sentence: string): string {
  return `${span.trim().toLowerCase()}\n${sentence.trim().toLowerCase()}`;
}

export function resetContextualizeClient(): void {
  sessionCache.clear();
  inflight.clear();
}

export function requestContextualize(
  payload: ContextualizePayload
): Promise<ContextualizeResult> {
  const key = contextualizeSessionKey(payload.span, payload.sentence);
  const cached = sessionCache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = fetch("/api/contextualize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(async (response) => {
      const data = (await response.json()) as {
        explanation?: string;
        translation?: string | null;
        error?: string;
      };
      if (!response.ok || !data.explanation) {
        throw new Error(data.error || "Não foi possível explicar este trecho.");
      }
      const result = {
        explanation: data.explanation,
        translation: data.translation?.trim() || null,
      };
      sessionCache.set(key, result);
      return result;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
