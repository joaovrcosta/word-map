import { Body, Controller, Get, Post } from "@nestjs/common";
import { IsIn, IsInt, Max, Min } from "class-validator";
import { getStudyToday, recordStudyHeartbeat } from "../domain/study";

class HeartbeatDto {
  @IsIn(["reading", "practice"])
  kind!: "reading" | "practice";

  @IsInt()
  @Min(1)
  @Max(30)
  seconds!: number;
}

@Controller("study")
export class StudyController {
  @Get("today")
  today() {
    return getStudyToday();
  }

  @Post("heartbeat")
  heartbeat(@Body() body: HeartbeatDto) {
    return recordStudyHeartbeat({
      kind: body.kind,
      seconds: body.seconds,
    });
  }
}
