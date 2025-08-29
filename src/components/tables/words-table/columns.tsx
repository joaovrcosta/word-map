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
    header: "Grau de confiança",
    cell: ({ row }) => {
      const confidence = row.getValue("confidence") as number;

      console.log(confidence);
      const maxBlocks = 4;
      const level = Math.round((confidence / 100) * maxBlocks);

      return (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: maxBlocks }).map((_, i) => (
              <div
                key={i}
                className={`h-4 w-2 rounded-sm transition-colors ${
                  i < level ? "bg-yellow-500" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
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
