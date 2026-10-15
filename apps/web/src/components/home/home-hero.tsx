import Link from "next/link";
import { labelForLevel, type Story } from "@/lib/home-catalog";

export function HomeHero({ story }: { story: Story }) {
  return (
    <section className="px-6 pt-6 sm:px-12">
      <div className="overflow-hidden rounded-3xl border border-[#e8eaed] bg-white shadow-sm dark:border-[#373e47] dark:bg-[#2d333b]">
        <div className="bg-gradient-to-r from-[#e7f8ee] to-white px-8 py-10 dark:from-[#143022] dark:to-[#2d333b] sm:px-10">
          <p className="text-[13px] font-bold text-[#14804a] dark:text-[#7ddea8]">
            {story.level} · {labelForLevel(story.level)}
          </p>
          <h1 className="mt-2 max-w-xl text-[36px] font-extrabold leading-tight text-[#1a1a1a] dark:text-white sm:text-[44px]">
            {story.title}
          </h1>
          <p className="mt-3 max-w-md text-[16px] leading-snug text-[#5c6570] dark:text-[#8b949e]">
            {story.summary}
          </p>
          <Link
            href={`/home/historias/${story.slug}`}
            className="mt-6 inline-flex items-center rounded-xl bg-[#24c875] px-6 py-2.5 text-[16px] font-bold text-white transition hover:bg-[#1eaf68]"
          >
            Começar
          </Link>
        </div>
      </div>
    </section>
  );
}
