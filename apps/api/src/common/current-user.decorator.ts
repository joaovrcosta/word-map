import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { User } from "../auth/current-user";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User | null => {
    const request = context.switchToHttp().getRequest<{ user?: User | null }>();
    return request.user ?? null;
  }
);
