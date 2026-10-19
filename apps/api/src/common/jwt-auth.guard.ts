import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Response } from "express";
import { AuthService } from "../auth/auth.service";
import { IS_PUBLIC } from "./public.decorator";
import { clearAuthCookie, readAccessToken } from "./cookies";
import type { User } from "../auth/current-user";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<{
      headers: { cookie?: string; authorization?: string };
      user?: User | null;
    }>();
    const response = context.switchToHttp().getResponse<Response>();
    const token = readAccessToken(request.headers);

    if (!token) {
      request.user = null;
      if (isPublic) return true;
      throw new UnauthorizedException("Usuário não autenticado");
    }

    const user = await this.auth.userFromToken(token);
    if (!user) {
      clearAuthCookie(response);
      request.user = null;
      if (isPublic) return true;
      throw new UnauthorizedException("Usuário não autenticado");
    }

    request.user = user;
    return true;
  }
}
