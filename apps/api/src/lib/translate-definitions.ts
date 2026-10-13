import { translateToPortugueseServer } from "./translate.server";

export async function translateDefinitions(
  definitions: string[]
): Promise<string[]> {
  if (!Array.isArray(definitions) || definitions.length === 0) {
    return definitions;
  }

  try {
    const validDefinitions = definitions.filter(
      (definition) => definition && definition.trim().length > 0
    );
    if (validDefinitions.length === 0) return definitions;

    const translated: string[] = [];
    for (const definition of validDefinitions) {
      translated.push(await translateToPortugueseServer(definition));
    }

    let index = 0;
    return definitions.map((definition) => {
      if (definition && definition.trim().length > 0) {
        return translated[index++];
      }
      return definition;
    });
  } catch {
    return definitions;
  }
}
