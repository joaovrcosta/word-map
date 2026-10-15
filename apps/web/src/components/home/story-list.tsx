import type { Story } from "@/lib/home-catalog";
import { HomePoster } from "./home-poster";
import { HomeRow } from "./home-row";

export function StoryList({ stories }: { stories: Story[] }) {
  return (
    <HomeRow title="Mini-histórias">
      {stories.map((story) => (
        <HomePoster
          key={story.slug}
          href={`/home/historias/${story.slug}`}
          title={story.title}
          kicker={story.level}
          slug={story.slug}
        />
      ))}
    </HomeRow>
  );
}
