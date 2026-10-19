jest.mock("../../auth/auth.service", () => ({
  AuthService: class AuthService {},
}));

import { UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { JwtAuthGuard } from "../jwt-auth.guard";
import type { User } from "../../auth/current-user";

const user: User = {
  id: 1,
  name: "Ana",
  email: "ana@example.com",
  username: "ana",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  role: "USER",
};

function setup(headers: { cookie?: string; authorization?: string }, isPublic: boolean) {
  const request: { headers: typeof headers; user?: User | null } = { headers };
  const response = { clearCookie: jest.fn() };
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  };
  const auth = {
    userFromToken: jest.fn().mockImplementation(async (token: string) => {
      return token === "valid" ? user : null;
    }),
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
  const guard = new JwtAuthGuard(reflector as never, auth as never);
  return { guard, context, request, auth };
}

describe("JwtAuthGuard", () => {
  it("aceita o cookie auth-token", async () => {
    const { guard, context, request, auth } = setup(
      { cookie: "auth-token=valid" },
      false
    );
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(auth.userFromToken).toHaveBeenCalledWith("valid");
    expect(request.user).toEqual(user);
  });

  it("aceita Authorization Bearer", async () => {
    const { guard, context, request, auth } = setup(
      { authorization: "Bearer valid" },
      false
    );
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(auth.userFromToken).toHaveBeenCalledWith("valid");
    expect(request.user).toEqual(user);
  });

  it("prefere o Bearer quando cookie e header chegam juntos", async () => {
    const { guard, context, auth } = setup(
      { cookie: "auth-token=valid", authorization: "Bearer other" },
      false
    );
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    expect(auth.userFromToken).toHaveBeenCalledWith("other");
  });

  it("rejeita rota protegida sem cookie e sem Bearer", async () => {
    const { guard, context, request, auth } = setup({}, false);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    expect(auth.userFromToken).not.toHaveBeenCalled();
    expect(request.user).toBeNull();
  });

  it("libera rota pública sem credencial", async () => {
    const { guard, context, request } = setup({}, true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeNull();
  });
});
