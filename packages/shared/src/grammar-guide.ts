export type GrammarClass = {
  slug: string;
  label: string;
  summary: string;
  explanation: string;
  exampleEn: string;
  examplePt: string;
  exampleNote: string;
};

export const GRAMMAR_CLASSES: GrammarClass[] = [
  {
    slug: "substantivo",
    label: "Substantivo",
    summary: "Dá nome a pessoas, coisas, lugares e ideias.",
    explanation:
      "O substantivo é a palavra que nomeia. Pode ser uma pessoa, um objeto, um lugar ou uma ideia. Na frase, ele costuma ser o assunto ou aquilo de que se fala.",
    exampleEn: "The little prince asked a question.",
    examplePt: "O pequeno príncipe fez uma pergunta.",
    exampleNote: "Prince nomeia o personagem. Question nomeia o que ele fez.",
  },
  {
    slug: "verbo",
    label: "Verbo",
    summary: "Diz a ação, o estado ou a mudança.",
    explanation:
      "O verbo conta o que acontece. Pode ser uma ação, como perguntar, ou um estado, como ser e estar. Sem ele, a frase não diz o que o substantivo faz.",
    exampleEn: "He asked many questions.",
    examplePt: "Ele fez muitas perguntas.",
    exampleNote: "Asked é o verbo: a ação de perguntar.",
  },
  {
    slug: "adjetivo",
    label: "Adjetivo",
    summary: "Diz como é o substantivo.",
    explanation:
      "O adjetivo caracteriza um substantivo. Ele informa tamanho, cor, qualidade ou quantidade. Fica junto do nome que está descrevendo.",
    exampleEn: "A little prince.",
    examplePt: "Um príncipe pequeno.",
    exampleNote: "Little descreve o príncipe.",
  },
  {
    slug: "adverbio",
    label: "Advérbio",
    summary: "Diz como, quando, onde ou com que intensidade.",
    explanation:
      "O advérbio modifica um verbo, um adjetivo ou outro advérbio. Ele não nomeia nada: acrescenta o modo, o tempo, o lugar ou a intensidade.",
    exampleEn: "He asked slowly.",
    examplePt: "Ele perguntou lentamente.",
    exampleNote: "Slowly diz como a pergunta foi feita.",
  },
  {
    slug: "pronome",
    label: "Pronome",
    summary: "Fica no lugar de um substantivo.",
    explanation:
      "O pronome evita repetir o nome. Ele aponta para uma pessoa, uma coisa ou uma ideia que já apareceu, ou que está clara na conversa.",
    exampleEn: "The prince was curious. He asked again.",
    examplePt: "O príncipe era curioso. Ele perguntou de novo.",
    exampleNote: "He substitui prince.",
  },
  {
    slug: "preposicao",
    label: "Preposição",
    summary: "Liga duas partes e marca a relação entre elas.",
    explanation:
      "A preposição é uma palavra curta que conecta. Ela indica lugar, tempo, causa ou assunto. Sozinha, quase não tem sentido; o sentido aparece na ligação.",
    exampleEn: "Questions about the world.",
    examplePt: "Perguntas sobre o mundo.",
    exampleNote: "About liga questions a world.",
  },
  {
    slug: "conjuncao",
    label: "Conjunção",
    summary: "Junta palavras ou frases.",
    explanation:
      "A conjunção une duas partes do mesmo tipo, ou liga uma ideia à outra. Ela pode somar, contrastar ou explicar a relação entre as frases.",
    exampleEn: "Questions and answers.",
    examplePt: "Perguntas e respostas.",
    exampleNote: "And junta os dois substantivos.",
  },
  {
    slug: "interjeicao",
    label: "Interjeição",
    summary: "É uma reação curta.",
    explanation:
      "A interjeição expressa emoção, saudação ou uma reação imediata. Ela pode formar uma frase sozinha e não precisa de verbo.",
    exampleEn: "Hello!",
    examplePt: "Olá!",
    exampleNote: "Hello é a saudação inteira.",
  },
  {
    slug: "phrasal-verb",
    label: "Phrasal verb",
    summary: "Verbo com partícula e um sentido próprio.",
    explanation:
      "Um phrasal verb junta um verbo e uma partícula, como up, out ou off. Juntos, eles formam um significado que não é a soma das partes.",
    exampleEn: "She gave up.",
    examplePt: "Ela desistiu.",
    exampleNote: "Give up não é “dar para cima”. O conjunto significa desistir.",
  },
  {
    slug: "frase",
    label: "Frase",
    summary: "Várias palavras guardadas como uma expressão só.",
    explanation:
      "No vault, uma frase é uma expressão de mais de uma palavra salva junta. O sentido vale para o conjunto, não para cada palavra isolada.",
    exampleEn: "Of course.",
    examplePt: "Claro.",
    exampleNote: "Of e course, separados, não dizem a mesma coisa.",
  },
];

const ALIASES: Record<string, string> = {
  noun: "substantivo",
  substantivo: "substantivo",
  verb: "verbo",
  verbo: "verbo",
  adjective: "adjetivo",
  adjetivo: "adjetivo",
  adverb: "adverbio",
  adverbio: "adverbio",
  pronoun: "pronome",
  pronome: "pronome",
  preposition: "preposicao",
  preposicao: "preposicao",
  conjunction: "conjuncao",
  conjuncao: "conjuncao",
  interjection: "interjeicao",
  interjeicao: "interjeicao",
  "phrasal verb": "phrasal-verb",
  "phrasal-verb": "phrasal-verb",
  phrase: "frase",
  frase: "frase",
};

export function resolveGrammarSlug(value?: string | null): string | null {
  if (!value) return null;
  const key = value.trim().toLowerCase().replace(/_/g, " ");
  return ALIASES[key] || ALIASES[key.replace(/\s+/g, "-")] || null;
}

export function grammarClassBySlug(slug?: string | null): GrammarClass | null {
  if (!slug) return null;
  return GRAMMAR_CLASSES.find((item) => item.slug === slug) ?? null;
}

export function grammarClassLabel(value?: string | null): string {
  const found = grammarClassBySlug(resolveGrammarSlug(value));
  if (found) return found.label;
  const text = value?.trim();
  return text || "Classe";
}

export function grammarGuidePath(value?: string | null): string | null {
  const slug = resolveGrammarSlug(value);
  if (!slug) return null;
  return `/home/gramatica/${slug}`;
}
