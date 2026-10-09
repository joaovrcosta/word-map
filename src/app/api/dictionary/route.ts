import { NextRequest, NextResponse } from "next/server";
import { fetchDictionaryEntries } from "@/lib/dictionary";

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get("word")?.trim() ?? "";

  if (!word) {
    return NextResponse.json(
      { error: "Palavra obrigatória", entries: [], entry: null },
      { status: 400 }
    );
  }

  const entries = await fetchDictionaryEntries(word);

  return NextResponse.json({
    entries,
    entry: entries[0] ?? null,
  });
}
