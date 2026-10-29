import { Controller, Get } from "@nestjs/common";
import { Public } from "./common/public.decorator";

@Controller("ping")
export class PingController {
  @Public()
  @Get()
  ping() {
    return { ok: true };
  }
}
