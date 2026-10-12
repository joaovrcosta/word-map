"use client";

import { useParams } from "next/navigation";
import { GrammarGuide } from "@/components/grammar-guide";

export default function GrammarClassPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  return <GrammarGuide focusSlug={slug} />;
}
