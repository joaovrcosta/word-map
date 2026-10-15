import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findStory } from "@/lib/home-catalog";

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = findStory(slug);
  if (!story) notFound();

  return (
    <div className="min-h-full bg-[#f6f7f9] px-6 pb-16 pt-5 dark:bg-[#22272e] sm:px-8">
      <Button variant="ghost" className="mb-3 -ml-2" asChild>
        <Link href="/home">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Link>
      </Button>
      <p className="text-[12px] font-extrabold uppercase tracking-wide text-[#14804a] dark:text-[#7ddea8]">
        {story.level} · {story.levelLabel}
      </p>
      <h1 className="mt-1 text-[26px] font-extrabold text-[#3c3c3c] dark:text-white">
        {story.title}
      </h1>
      <p className="mt-2 max-w-xl text-[15px] leading-snug text-[#777] dark:text-[#8b949e]">
        {story.summary}
      </p>
      <p className="mt-8 text-[15px] font-bold text-[#afafaf]">Em breve</p>
    </div>
  );
}
