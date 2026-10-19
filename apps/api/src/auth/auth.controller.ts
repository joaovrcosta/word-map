import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService, type AuthActionResult } from "./auth.service";
import {
  GoogleDto,
  LoginDto,
  RegisterDto,
  ResetCodeDto,
  ResetPasswordDto,
  VerifyResetDto,
} from "./auth.dto";
import { Public } from "../common/public.decorator";
import { CurrentUser } from "../common/current-user.decorator";
import {
  AUTH_COOKIE,
  MOBILE_CLIENT_HEADER,
  authCookieOptions,
  clearAuthCookie,
  isMobileClient,
} from "../common/cookies";
import type { User } from "./current-user";

function sessionBody(result: AuthActionResult, mobile: boolean) {
  if (!result.success) return result;
  if (mobile && result.token) {
    return { success: true as const, user: result.user, token: result.token };
  }
  return { success: true as const, user: result.user };
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("register")
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Public()
  @Post("login")
  async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.auth.login(body);
    if (result.success && result.token) {
      response.cookie(AUTH_COOKIE, result.token, authCookieOptions());
    }
    return sessionBody(result, isMobileClient(request.get(MOBILE_CLIENT_HEADER)));
  }

  @Public()
  @Post("google")
  async google(
    @Body() body: GoogleDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.auth.loginWithGoogle(
      body.credential,
      body.username
    );
    if (result.success && result.token) {
      response.cookie(AUTH_COOKIE, result.token, authCookieOptions());
    }
    return sessionBody(result, isMobileClient(request.get(MOBILE_CLIENT_HEADER)));
  }

  @Public()
  @Post("logout")
  logout(@Res({ passthrough: true }) response: Response) {
    clearAuthCookie(response);
    return { success: true };
  }

  @Public()
  @Get("me")
  me(@CurrentUser() user: User | null) {
    return { user };
  }

  @Public()
  @Post("reset-code")
  resetCode(@Body() body: ResetCodeDto) {
    return this.auth.generateResetCode(body.email);
  }

  @Public()
  @Post("reset-code/verify")
  verifyReset(@Body() body: VerifyResetDto) {
    return this.auth.verifyResetCode(body.email, body.code);
  }

  @Public()
  @Post("reset-password")
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.auth.resetPassword(body.email, body.code, body.newPassword);
  }
}
