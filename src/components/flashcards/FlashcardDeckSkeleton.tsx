import { Skeleton } from "@/components/ui/skeleton";

export function FlashcardDeckSkeleton() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-3 h-4 w-32" />
      <Skeleton className="mt-8 h-12 w-[210px] rounded-2xl" />
    </div>
  );
}
