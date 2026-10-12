export type ContextualizePayload = {
  span: string;
  sentence: string;
  paragraph: string;
  previousParagraph?: string | null;
  wordId?: number;
};

const sessionCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

export function contextualizeSessionKey(span: string, sentence: string): string {
  return `${span.trim().toLowerCase()}\n${sentence.trim().toLowerCase()}`;
}

export function resetContextualizeClient(): void {
  sessionCache.clear();
  inflight.clear();
}

export function requestContextualize(
  payload: ContextualizePayload
): Promise<string> {
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
        error?: string;
      };
      if (!response.ok || !data.explanation) {
        throw new Error(data.error || "Não foi possível explicar este trecho.");
      }
      sessionCache.set(key, data.explanation);
      return data.explanation;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
