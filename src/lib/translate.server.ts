import "server-only";

export async function translateToPortugueseServer(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;

  try {
    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodedText}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) return text;

    const data = await response.json();
    if (data && Array.isArray(data) && data[0] && Array.isArray(data[0])) {
      const translations = data[0];
      if (
        translations.length > 0 &&
        translations[0] &&
        Array.isArray(translations[0])
      ) {
        return translations[0][0] || text;
      }
    }

    return text;
  } catch {
    return text;
  }
}
