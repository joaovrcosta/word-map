// Tipagem
export interface WordType {
  id: number;
  status?: boolean;
  name: string;
  gramaticalClass: string;
  category: string;
  translations: string[];
  lastPractice: Date;
  confidence: number;
  isSaved: boolean;
}

// Dados
export const ativos: WordType[] = [
  {
    id: 1,
    status: true,
    name: "tropical",
    category: "word",
    gramaticalClass: "adjetivo",
    translations: ["tropicais", "tropical"],
    lastPractice: new Date("2023-07-15T10:30:00Z"),
    confidence: 2,
    isSaved: true,
  },
  {
    id: 2,
    status: true,
    name: "get away",
    category: "word",
    gramaticalClass: "adjetivo",
    translations: ["tropicais", "tropical"],
    lastPractice: new Date("2023-07-15T10:30:00Z"),
    confidence: 3,
    isSaved: true,
  },
  {
    id: 3,
    status: true,
    name: "itinerary",
    category: "word",
    gramaticalClass: "adjetivo",
    translations: ["tropicais", "tropical"],
    lastPractice: new Date("2023-07-15T10:30:00Z"),
    confidence: 1,
    isSaved: true,
  },
  {
    id: 4,
    status: true,
    name: "soil",
    category: "word",
    gramaticalClass: "adjetivo",
    translations: ["tropicais", "tropical"],
    lastPractice: new Date("2023-07-15T10:30:00Z"),
    confidence: 1,
    isSaved: true,
  },
  {
    id: 5,
    status: true,
    name: "spray",
    category: "word",
    gramaticalClass: "adjetivo",
    translations: ["tropicais", "tropical"],
    lastPractice: new Date("2023-07-15T10:30:00Z"),
    confidence: 0,
    isSaved: true,
  },
  {
    id: 6,
    status: true,
    name: "stem",
    category: "word",
    gramaticalClass: "adjetivo",
    translations: ["tropicais", "tropical"],
    lastPractice: new Date("2023-07-15T10:30:00Z"),
    confidence: 3,
    isSaved: true,
  },
  {
    id: 7,
    status: true,
    name: "looking",
    category: "word",
    gramaticalClass: "adjetivo",
    translations: ["tropicais", "tropical"],
    lastPractice: new Date("2023-07-15T10:30:00Z"),
    confidence: 4,
    isSaved: true,
  },
  {
    id: 8,
    status: true,
    name: "muddy",
    category: "word",
    gramaticalClass: "adjetivo",
    translations: ["tropicais", "tropical"],
    lastPractice: new Date("2023-07-15T10:30:00Z"),
    confidence: 4,
    isSaved: true,
  },
];
