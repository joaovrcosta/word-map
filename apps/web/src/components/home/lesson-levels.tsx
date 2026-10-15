import type { LevelSection } from "@/lib/home-catalog";
import { HomePoster } from "./home-poster";
import { HomeRow } from "./home-row";

export function LessonLevels({ levels }: { levels: LevelSection[] }) {
  return (
    <div className="space-y-2">
      {levels.map((level) => (
        <HomeRow key={level.code} title={`${level.code} · ${level.label}`}>
          {level.lessons.map((lesson) => (
            <HomePoster
              key={lesson.slug}
              href={`/home/licoes/${lesson.slug}`}
              title={lesson.title}
              kicker={level.code}
              slug={lesson.slug}
            />
          ))}
        </HomeRow>
      ))}
    </div>
  );
}
