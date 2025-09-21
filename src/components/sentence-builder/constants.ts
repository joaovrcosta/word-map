import { HighlightColor } from "./types";

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  { name: "Padrão", value: "", bg: "bg-gray-100", text: "text-gray-800" },
  { name: "Vermelho", value: "red", bg: "bg-red-100", text: "text-red-800" },
  { name: "Azul", value: "blue", bg: "bg-blue-100", text: "text-blue-800" },
  {
    name: "Verde",
    value: "green",
    bg: "bg-green-100",
    text: "text-green-800",
  },
  {
    name: "Amarelo",
    value: "yellow",
    bg: "bg-yellow-100",
    text: "text-yellow-800",
  },
  {
    name: "Roxo",
    value: "purple",
    bg: "bg-purple-100",
    text: "text-purple-800",
  },
  { name: "Rosa", value: "pink", bg: "bg-pink-100", text: "text-pink-800" },
  {
    name: "Laranja",
    value: "orange",
    bg: "bg-orange-100",
    text: "text-orange-800",
  },
];

export const LINE_HEIGHT = 20; // Altura aproximada da linha para posicionamento do dropdown
export const MAX_SEARCH_RESULTS = 10; // Limite de resultados da pesquisa
export const MAX_NOTES_PREVIEW = 100; // Máximo de caracteres para preview das anotações
