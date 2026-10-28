"use client";

import { useParams } from "next/navigation";
import { NewsForm } from "@/components/news-form";

export default function EditNewsPage() {
  const params = useParams<{ id: string }>();
  return <NewsForm newsId={Number(params.id)} />;
}
