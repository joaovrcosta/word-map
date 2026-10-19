"use client";

import { useParams } from "next/navigation";
import { TextForm } from "@/components/text-form";

export default function EditTextPage() {
  const params = useParams<{ id: string }>();
  return <TextForm textId={Number(params.id)} />;
}
