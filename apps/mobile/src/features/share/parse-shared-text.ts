/** Extrai uma palavra/frase curta a partir de texto compartilhado de outro app. */
export function parseSharedText(raw: string): string {
  const lines = raw
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let candidate = (lines[0] ?? raw).replace(/\s+/g, " ").trim();
  if (!candidate) return "";

  candidate = candidate.replace(/^["'“”‘’«»]+|["'“”‘’«»]+$/g, "").trim();
  if (/^https?:\/\//i.test(candidate) || /^www\./i.test(candidate)) return "";

  const tokens = candidate.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "";

  // Frase longa → primeira palavra; até 6 tokens → mantém como frase.
  const picked =
    tokens.length > 6
      ? tokens[0]!
      : tokens.join(" ");

  return picked
    .replace(/^[^A-Za-zÀ-ÖØ-öø-ÿ0-9']+|[^A-Za-zÀ-ÖØ-öø-ÿ0-9']+$/g, "")
    .slice(0, 80)
    .trim();
}

export function sharedPayloadText(
  payloads: Array<{ value?: string; shareType?: string; mimeType?: string }>
): string {
  for (const payload of payloads) {
    const value = payload.value?.trim();
    if (!value) continue;
    const type = (payload.shareType ?? "").toLowerCase();
    const mime = (payload.mimeType ?? "").toLowerCase();
    if (type === "text" || type === "url" || mime.startsWith("text/") || !type) {
      return value;
    }
  }
  return payloads.find((item) => item.value?.trim())?.value?.trim() ?? "";
}
