"use client";

import { SentenceBuilder } from "@/components/sentence-builder";

export default function SentenceBuilderPage() {
  return (
    <div className="min-h-full max-w-full overflow-x-hidden bg-white dark:bg-gray-950">
      <div className="px-8 pt-5 pb-10">
        <SentenceBuilder />
      </div>
    </div>
  );
}
