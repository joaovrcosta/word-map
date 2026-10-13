import { Module } from "@nestjs/common";
import { TutorController } from "./tutor.controller";
import { TutorRepository, TutorService } from "./tutor.service";

@Module({
  controllers: [TutorController],
  providers: [TutorRepository, TutorService],
})
export class TutorModule {}
