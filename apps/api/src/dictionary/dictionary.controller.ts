import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { fetchDictionaryEntries } from "@word-map/shared/dictionary";
import { Public } from "../common/public.decorator";

@Injectable()
export class DictionaryService {
  lookup(word: string) {
    return fetchDictionaryEntries(word);
  }
}

@Controller("dictionary")
export class DictionaryController {
  constructor(private readonly dictionary: DictionaryService) {}

  @Public()
  @Get()
  async lookup(@Query("word") word = "") {
    const trimmed = word.trim();
    if (!trimmed) {
      throw new BadRequestException({
        error: "Palavra obrigatória",
        entries: [],
        entry: null,
      });
    }
    const entries = await this.dictionary.lookup(trimmed);
    return { entries, entry: entries[0] ?? null };
  }
}
