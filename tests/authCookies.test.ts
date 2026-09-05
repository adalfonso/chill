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
