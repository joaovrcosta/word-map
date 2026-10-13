import {
  BadRequestException,
  Body,
  Controller,
  Injectable,
  Post,
} from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { Public } from "../common/public.decorator";

class TranslateDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  target?: string;
}

@Injectable()
export class TranslateService {
  async translate(text: string, source = "en", target = "pt") {
    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodedText}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new BadRequestException({ error: "Erro no serviço de tradução" });
    }

    const data = await response.json();
    let translatedText = text;
    if (data && Array.isArray(data) && data[0] && Array.isArray(data[0])) {
      const translations = data[0];
      if (
        translations.length > 0 &&
        translations[0] &&
        Array.isArray(translations[0])
      ) {
        translatedText = translations[0][0] || text;
      }
    }

    return {
      translatedText,
      detectedLanguage: data[2] ? { code: data[2], confidence: 1 } : undefined,
    };
  }
}

@Controller("translate")
export class TranslateController {
  constructor(private readonly translate: TranslateService) {}

  @Public()
  @Post()
  translateText(@Body() body: TranslateDto) {
    if (!body.text) {
      throw new BadRequestException({ error: "Texto para tradução é obrigatório" });
    }
    return this.translate.translate(body.text, body.source, body.target);
  }
}
