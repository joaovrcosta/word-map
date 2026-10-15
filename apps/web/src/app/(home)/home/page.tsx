import { HomeHero } from "@/components/home/home-hero";
import { LessonLevels } from "@/components/home/lesson-levels";
import { StoryList } from "@/components/home/story-list";
import { HOME_LEVELS, HOME_STORIES } from "@/lib/home-catalog";

export default function HomePage() {
  const featured = HOME_STORIES[0];

  return (
    <div className="min-h-full bg-[#f6f7f9] pb-16 dark:bg-[#22272e]">
      {featured ? <HomeHero story={featured} /> : null}
      <div className="relative z-10 mt-8 space-y-6">
        <StoryList stories={HOME_STORIES} />
        <LessonLevels levels={HOME_LEVELS} />
      </div>
    </div>
  );
}
