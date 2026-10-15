import type { Word } from "@/actions/actions";
import { grammarClassLabel } from "@/lib/grammar-guide";

const CONFIDENCE_LABELS = ["Não lembro", "Difícil", "Bom", "Fácil"] as const;

export function VaultReport({ words }: { words: Word[] }) {
  const total = words.length;
  const saved = words.filter((word) => word.isSaved).length;
  const average =
    total > 0
      ? Math.round(words.reduce((sum, word) => sum + word.confidence, 0) / total)
      : 0;

  const levels = CONFIDENCE_LABELS.map((label, index) => ({
    label,
    count: words.filter((word) => word.confidence === index + 1).length,
  }));

  const classes = Object.entries(
    words.reduce<Record<string, number>>((groups, word) => {
      const label = grammarClassLabel(word.grammaticalClass);
      groups[label] = (groups[label] ?? 0) + 1;
      return groups;
    }, {})
  ).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));

  const numbers = [
    { label: "Palavras", value: String(total) },
    { label: "Salvas", value: String(saved) },
    { label: "Confiança", value: total > 0 ? `${average}/4` : "—" },
  ];

  return (
    <div className="px-8 py-8">
      <div className="flex max-w-lg gap-12">
        {numbers.map((item) => (
          <div key={item.label}>
            <p className="text-[28px] font-extrabold leading-none text-[#3c3c3c] dark:text-white">
              {item.value}
            </p>
            <p className="mt-2 text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf]">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <p className="mt-10 text-[15px] text-[#777] dark:text-[#8b949e]">
          Este vault ainda não tem palavras.
        </p>
      ) : (
        <div className="mt-10 grid max-w-3xl gap-10 sm:grid-cols-2">
          <section>
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf]">
              Por confiança
            </p>
            <ul className="mt-1 divide-y divide-[#e5e5e5] dark:divide-[#373e47]">
              {levels.map((level) => (
                <li
                  key={level.label}
                  className="flex items-center justify-between py-3"
                >
                  <span className="text-[15px] font-extrabold text-[#3c3c3c] dark:text-white">
                    {level.label}
                  </span>
                  <span className="text-[15px] font-bold text-[#14804a] dark:text-[#7ddea8]">
                    {level.count}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf]">
              Por classe
            </p>
            <ul className="mt-1 divide-y divide-[#e5e5e5] dark:divide-[#373e47]">
              {classes.map(([label, count]) => (
                <li
                  key={label}
                  className="flex items-center justify-between py-3"
                >
                  <span className="text-[15px] font-extrabold text-[#3c3c3c] dark:text-white">
                    {label}
                  </span>
                  <span className="text-[15px] font-bold text-[#14804a] dark:text-[#7ddea8]">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
