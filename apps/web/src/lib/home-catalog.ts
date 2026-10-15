export type EnglishLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type Lesson = {
  slug: string;
  title: string;
  description: string;
};

export type LevelSection = {
  code: EnglishLevel;
  label: string;
  lessons: Lesson[];
};

export type Story = {
  slug: string;
  title: string;
  level: EnglishLevel;
  summary: string;
};

export type LessonMatch = Lesson & {
  level: EnglishLevel;
  levelLabel: string;
};

export type StoryMatch = Story & {
  levelLabel: string;
};

export const HOME_LEVELS: LevelSection[] = [
  {
    code: "A1",
    label: "Iniciante",
    lessons: [
      {
        slug: "cumprimentos",
        title: "Cumprimentos do dia",
        description: "Dizer oi, pedir o nome e se despedir.",
      },
      {
        slug: "numeros-e-horas",
        title: "Números e horas",
        description: "Contar até vinte e dizer que horas são.",
      },
      {
        slug: "apresentacoes",
        title: "Apresentações",
        description: "Dizer de onde você é e o que faz.",
      },
      {
        slug: "cores",
        title: "Cores",
        description: "Nomear as cores de objetos do dia a dia.",
      },
      {
        slug: "a-familia",
        title: "A família",
        description: "Apresentar as pessoas da sua casa.",
      },
      {
        slug: "comida-simples",
        title: "Comida simples",
        description: "Falar o que você come e o que gosta.",
      },
    ],
  },
  {
    code: "A2",
    label: "Elementar",
    lessons: [
      {
        slug: "rotina-da-manha",
        title: "A rotina da manhã",
        description: "Falar o que você faz antes de sair de casa.",
      },
      {
        slug: "no-mercado",
        title: "No mercado",
        description: "Pedir um item, o preço e a quantidade.",
      },
      {
        slug: "o-clima",
        title: "O clima",
        description: "Descrever o tempo de hoje e de amanhã.",
      },
      {
        slug: "pedindo-direcao",
        title: "Pedindo direção",
        description: "Perguntar como chegar a um lugar.",
      },
      {
        slug: "o-fim-de-semana",
        title: "O fim de semana",
        description: "Contar o que você fez no sábado.",
      },
      {
        slug: "no-restaurante",
        title: "No restaurante",
        description: "Pedir um prato e a conta.",
      },
    ],
  },
  {
    code: "B1",
    label: "Intermediário",
    lessons: [
      {
        slug: "contando-uma-viagem",
        title: "Contando uma viagem",
        description: "Relatar o que aconteceu no passado.",
      },
      {
        slug: "dando-uma-opiniao",
        title: "Dando uma opinião",
        description: "Concordar, discordar e explicar o motivo.",
      },
      {
        slug: "fazendo-planos",
        title: "Fazendo planos",
        description: "Marcar um encontro e sugerir um horário.",
      },
      {
        slug: "uma-experiencia",
        title: "Uma experiência",
        description: "Contar algo que você já fez na vida.",
      },
      {
        slug: "um-convite",
        title: "Um convite",
        description: "Convidar alguém e responder com educação.",
      },
      {
        slug: "um-problema",
        title: "Um problema",
        description: "Explicar o que deu errado e pedir ajuda.",
      },
    ],
  },
  {
    code: "B2",
    label: "Intermediário alto",
    lessons: [
      {
        slug: "reuniao-de-trabalho",
        title: "Uma reunião de trabalho",
        description: "Propor uma ideia e responder a uma objeção.",
      },
      {
        slug: "lendo-uma-noticia",
        title: "Lendo uma notícia",
        description: "Separar o fato do comentário em um texto curto.",
      },
      {
        slug: "uma-hipotese",
        title: "Uma hipótese",
        description: "Falar o que aconteceria se algo mudasse.",
      },
      {
        slug: "uma-reclamacao",
        title: "Uma reclamação",
        description: "Descrever um problema e pedir uma solução.",
      },
      {
        slug: "um-resumo",
        title: "Um resumo",
        description: "Condensar um texto em poucas frases.",
      },
      {
        slug: "uma-entrevista",
        title: "Uma entrevista",
        description: "Responder perguntas sobre a sua trajetória.",
      },
    ],
  },
  {
    code: "C1",
    label: "Avançado",
    lessons: [
      {
        slug: "defendendo-um-ponto",
        title: "Defendendo um ponto",
        description: "Sustentar um argumento com um exemplo concreto.",
      },
      {
        slug: "nuances-de-tom",
        title: "Nuances de tom",
        description: "Escolher uma frase mais direta ou mais cuidadosa.",
      },
      {
        slug: "uma-concessao",
        title: "Uma concessão",
        description: "Admitir um ponto e manter o seu argumento.",
      },
      {
        slug: "mais-precisao",
        title: "Mais precisão",
        description: "Trocar uma frase vaga por uma frase exata.",
      },
      {
        slug: "uma-narrativa",
        title: "Uma narrativa",
        description: "Organizar um relato com começo, meio e fim.",
      },
      {
        slug: "um-debate",
        title: "Um debate",
        description: "Responder a um contra-argumento sem repetir a tese.",
      },
    ],
  },
  {
    code: "C2",
    label: "Proficiente",
    lessons: [
      {
        slug: "estilo-e-registro",
        title: "Estilo e registro",
        description: "Trocar a mesma ideia entre fala formal e informal.",
      },
      {
        slug: "ironia-e-subtexto",
        title: "Ironia e subtexto",
        description: "Ler o que a frase sugere além do sentido literal.",
      },
      {
        slug: "ambiguidade",
        title: "Ambiguidade",
        description: "Notar duas leituras possíveis da mesma frase.",
      },
      {
        slug: "ritmo-da-frase",
        title: "Ritmo da frase",
        description: "Encurtar ou alongar uma ideia de propósito.",
      },
      {
        slug: "uma-citacao",
        title: "Uma citação",
        description: "Trazer a fala de alguém para dentro do seu texto.",
      },
      {
        slug: "reescrever",
        title: "Reescrever",
        description: "Dizer a mesma coisa com outro registro.",
      },
    ],
  },
];

export const HOME_STORIES: Story[] = [
  {
    slug: "o-cafe-da-esquina",
    title: "O café da esquina",
    level: "A1",
    summary: "Ana pede um chá e pergunta o nome de quem atende.",
  },
  {
    slug: "a-chave-perdida",
    title: "A chave perdida",
    level: "A2",
    summary: "Leo procura a chave em casa antes de sair para o trabalho.",
  },
  {
    slug: "o-trem-das-oito",
    title: "O trem das oito",
    level: "B1",
    summary: "Maya perde o trem e conta o atraso para uma colega.",
  },
  {
    slug: "a-carta-sem-remetente",
    title: "A carta sem remetente",
    level: "B2",
    summary: "Sam lê um bilhete curto e tenta entender quem o deixou.",
  },
  {
    slug: "a-chuva",
    title: "A chuva",
    level: "A2",
    summary: "Nina esquece o guarda-chuva e pede abrigo a um vizinho.",
  },
  {
    slug: "o-mapa",
    title: "O mapa",
    level: "B1",
    summary: "Theo segue um mapa antigo e acaba na rua errada.",
  },
  {
    slug: "a-janela",
    title: "A janela",
    level: "C1",
    summary: "Rita observa o prédio da frente e imagina a vida de quem mora lá.",
  },
  {
    slug: "o-ensaio",
    title: "O ensaio",
    level: "C2",
    summary: "Eli ensaia um discurso e muda o tom a cada leitura.",
  },
];

const levelLabel = new Map(HOME_LEVELS.map((level) => [level.code, level.label]));

export function labelForLevel(level: EnglishLevel): string {
  return levelLabel.get(level) ?? level;
}

export function findLesson(slug: string): LessonMatch | null {
  for (const level of HOME_LEVELS) {
    const lesson = level.lessons.find((item) => item.slug === slug);
    if (lesson) {
      return {
        ...lesson,
        level: level.code,
        levelLabel: level.label,
      };
    }
  }
  return null;
}

export function findStory(slug: string): StoryMatch | null {
  const story = HOME_STORIES.find((item) => item.slug === slug);
  if (!story) return null;
  return { ...story, levelLabel: labelForLevel(story.level) };
}
