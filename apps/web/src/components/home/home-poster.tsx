import Link from "next/link";
import { posterTone } from "./poster-tone";

export function HomePoster({
  href,
  title,
  kicker,
  slug,
}: {
  href: string;
  title: string;
  kicker: string;
  slug: string;
}) {
  const [from, to] = posterTone(slug);

  return (
    <Link
      href={href}
      className="group/card block w-[200px] shrink-0 overflow-hidden rounded-2xl border border-[#e8eaed] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:w-[220px] dark:border-[#373e47] dark:bg-[#2d333b]"
    >
      <span
        className="flex h-[92px] items-end px-3 pb-2"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        <span className="text-[13px] font-bold text-[#14804a]">{kicker}</span>
      </span>
      <span className="block px-3 py-3 text-[15px] font-bold leading-tight text-[#1a1a1a] dark:text-white">
        {title}
      </span>
    </Link>
  );
}
