import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { getPublishedNews, listPublishedNews } from "../domain/news";

@Controller("news")
export class NewsController {
  @Get()
  list() {
    return listPublishedNews();
  }

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number) {
    return getPublishedNews(id);
  }
}
