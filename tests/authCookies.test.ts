/** @jest-environment node */
import {
  accessTokenCookieOptions,
  clearAccessTokenCookieOptions,
  clearRefreshTokenCookieOptions,
  refreshTokenCookieOptions,
} from "../server/lib/auth/cookies";

// cookies.ts now also exports readOrCreateDeviceId, which reads env.NODE_ENV
// -- mocking server/init keeps this file from pulling in the real
// (ESM-only) Prisma client transitively, same as every other auth test.
jest.mock("../server/init", () => ({
  env: { SIGNING_KEY: "test-signing-key", NODE_ENV: "test" },
}));

describe("accessTokenCookieOptions", () => {
  it("carries maxAge, Secure, HttpOnly, SameSite=Lax, Path=/", () => {
    expect(accessTokenCookieOptions()).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: expect.any(Number),
    });
  });

  it("is Secure regardless of NODE_ENV", () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    expect(accessTokenCookieOptions().secure).toBe(true);

    process.env.NODE_ENV = original;
  });
});

describe("refreshTokenCookieOptions", () => {
  it("carries Secure, HttpOnly, SameSite=Strict, Path=/auth/refresh", () => {
    expect(refreshTokenCookieOptions()).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/auth/refresh",
      maxAge: expect.any(Number),
    });
  });

  it("is Secure regardless of NODE_ENV", () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    expect(refreshTokenCookieOptions().secure).toBe(true);

    process.env.NODE_ENV = original;
  });
});

describe("clear-cookie options", () => {
  it("match the access cookie's set path", () => {
    expect(clearAccessTokenCookieOptions().path).toEqual(
      accessTokenCookieOptions().path,
    );
  });

  it("match the refresh cookie's set path", () => {
    expect(clearRefreshTokenCookieOptions().path).toEqual(
      refreshTokenCookieOptions().path,
    );
  });
});

describe("INSECURE_DEV_COOKIES dev switch", () => {
  /** Load a fresh copy of cookies.ts under the given env */
  const loadWithEnv = (node_env: string, switch_value?: string) => {
    const saved = { ...process.env };
    process.env.NODE_ENV = node_env;

    if (switch_value === undefined) {
      delete process.env.INSECURE_DEV_COOKIES;
    } else {
      process.env.INSECURE_DEV_COOKIES = switch_value;
    }

    try {
      let mod!: typeof import("../server/lib/auth/cookies");
      jest.isolateModules(() => {
        // isolateModules only isolates synchronous require, not import()
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        mod = require("../server/lib/auth/cookies");
      });
      return mod;
    } finally {
      process.env = saved;
    }
  };

  it("drops Secure and the __Secure- prefix in development when enabled", () => {
    const cookies = loadWithEnv("development", "true");

    expect(cookies.ACCESS_TOKEN_COOKIE).toBe("access_token");
    expect(cookies.REFRESH_TOKEN_COOKIE).toBe("refresh_token");
    expect(cookies.accessTokenCookieOptions().secure).toBe(false);
    expect(cookies.refreshTokenCookieOptions().secure).toBe(false);
  });

  it.each([
    ["development", undefined],
    ["development", "false"],
    ["production", "true"],
    ["test", "true"],
  ])("stays Secure and prefixed for NODE_ENV=%s, switch=%s", (env, value) => {
    const cookies = loadWithEnv(env, value);

    expect(cookies.ACCESS_TOKEN_COOKIE).toBe("__Secure-access_token");
    expect(cookies.accessTokenCookieOptions().secure).toBe(true);
    expect(cookies.refreshTokenCookieOptions().secure).toBe(true);
  });
});
