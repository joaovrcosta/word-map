import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./common/jwt-auth.guard";
import { RolesGuard } from "./common/roles.guard";
import { HubModule } from "./hub/hub.module";
import { UserContextInterceptor } from "./common/user-context.interceptor";
import { ApiExceptionFilter } from "./common/api-exception.filter";
import { VaultsModule } from "./vaults/vaults.module";
import { WordsModule } from "./words/words.module";
import { TextsModule } from "./texts/texts.module";
import { ConnectionsModule } from "./connections/connections.module";
import { BooksModule } from "./books/books.module";
import { SentencesModule } from "./sentences/sentences.module";
import { UsersModule } from "./users/users.module";
import { FlashcardsModule } from "./flashcards/flashcards.module";
import { TutorModule } from "./tutor/tutor.module";
import { DictionaryModule } from "./dictionary/dictionary.module";
import { TranslateModule } from "./translate/translate.module";
import { HealthController } from "./health.controller";
import { RankingModule } from "./ranking/ranking.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    VaultsModule,
    WordsModule,
    TextsModule,
    ConnectionsModule,
    BooksModule,
    SentencesModule,
    UsersModule,
    FlashcardsModule,
    TutorModule,
    DictionaryModule,
    TranslateModule,
    RankingModule,
    HubModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: UserContextInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
