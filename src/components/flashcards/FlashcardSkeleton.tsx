import { Skeleton } from "@/components/ui/skeleton";

export function FlashcardSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-2 py-10">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-4 h-10 w-48" />
      <Skeleton className="mt-4 h-4 w-24" />
    </div>
  );
}
