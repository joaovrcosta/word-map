"use client";

import { Word } from "@/actions/actions";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { ColumnDef } from "@tanstack/react-table";

export const columns: ColumnDef<Word>[] = [
  {
    accessorKey: "name",
    header: "Palavra",
    cell: ({ row }) => {
      const wordName = row.getValue("name") as string;
      const wordTranslations = row.original.translations;

      return (
        <div className="">
          <p className="font-medium">{wordName}</p>
          <p className="text-sm text-gray-500">{wordTranslations.join(", ")}</p>
        </div>
      );
    },
  },
  {
    accessorKey: "grammaticalClass",
    header: "Categoria gramatical",
    cell: ({ row }) => {
      const grammaticalClass = row.getValue("grammaticalClass") as string;
      return <span className="capitalize">{grammaticalClass}</span>;
    },
  },
  {
    accessorKey: "category",
    header: "Categoria",
    cell: ({ row }) => {
      const category = row.getValue("category") as string;
      return <span className="capitalize">{category}</span>;
    },
  },
  {
    accessorKey: "confidence",
    header: "Nível de Confiança",
    cell: ({ row }) => {
      const confidence = row.getValue("confidence") as number;

      const getConfidenceText = (level: number) => {
        switch (level) {
          case 1:
            return "Iniciante";
          case 2:
            return "Básico";
          case 3:
            return "Intermediário";
          case 4:
            return "Avançado";
          default:
            return "Desconhecido";
        }
      };

      const getConfidenceColor = (level: number) => {
        switch (level) {
          case 1:
            return "text-red-500";
          case 2:
            return "text-yellow-500";
          case 3:
            return "text-blue-500";
          case 4:
            return "text-green-500";
          default:
            return "text-gray-500";
        }
      };

      return (
        <div className="flex items-center gap-2">
          <span className={`font-medium ${getConfidenceColor(confidence)}`}>
            {confidence}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            - {getConfidenceText(confidence)}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "isSaved",
    header: "Salva",
    cell: ({ row }) => {
      const isSaved = row.getValue("isSaved") as boolean;

      return isSaved ? (
        <CheckCircle
          className="text-green-500 w-5 h-5"
          weight="fill"
          size={32}
        />
      ) : (
        <XCircle className="text-red-500 w-5 h-5" />
      );
    },
  },
];
