/** @vitest-environment node */
import {
  isAuthenticatedApi,
  isAuthenticatedPage,
} from "../server/middleware/isAuthenticated";
import { ACCESS_TOKEN_COOKIE } from "../server/lib/auth/cookies";

vi.mock("../server/init", () => ({
  env: { SIGNING_KEY: "test-signing-key" },
}));

const find_unique = vi.fn();

vi.mock("../server/lib/data/db", () => ({
  db: { user: { findUnique: (...args: unknown[]) => find_unique(...args) } },
}));

const is_denied = vi.fn().mockResolvedValue(false);

vi.mock("../server/lib/auth/DenyList", () => ({
  denyList: { instance: () => ({ isDenied: (...args: unknown[]) => is_denied(...args) }) },
}));

const makeRes = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  redirect: vi.fn().mockReturnThis(),
});

beforeEach(() => {
  find_unique.mockReset();
  is_denied.mockReset().mockResolvedValue(false);
});

describe("isAuthenticatedApi", () => {
  it("responds with JSON 401 (never a redirect) when there is no access-token cookie", async () => {
    const req = { cookies: {} } as any;
    const res = makeRes();
    const next = vi.fn();

    await isAuthenticatedApi(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("responds with JSON 401 when the deny list denies the session", async () => {
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      {
        user_id: 1,
        email: "user@example.com",
        session_id: "abcd",
        login_session_id: 42,
        typ: "access",
      },
      "test-signing-key",
    );
    is_denied.mockResolvedValue(true);

    const req = { cookies: { [ACCESS_TOKEN_COOKIE]: token } } as any;
    const res = makeRes();
    const next = vi.fn();

    await isAuthenticatedApi(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.redirect).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() and populates req._user/req.user on a valid token", async () => {
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      {
        user_id: 1,
        email: "user@example.com",
        session_id: "abcd",
        login_session_id: 42,
        typ: "access",
      },
      "test-signing-key",
    );
    find_unique.mockResolvedValue({ id: 1, email: "user@example.com" });

    const req = { cookies: { [ACCESS_TOKEN_COOKIE]: token } } as any;
    const res = makeRes();
    const next = vi.fn();

    await isAuthenticatedApi(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req._user.login_session_id).toBe(42);
    expect(req.user).toEqual({ id: 1, email: "user@example.com" });
  });
});

describe("isAuthenticatedPage", () => {
  it("redirects 302, never 301, when there is no access-token cookie", async () => {
    const req = { cookies: {} } as any;
    const res = makeRes();
    const next = vi.fn();

    await isAuthenticatedPage(req, res as any, next);

    expect(res.redirect).toHaveBeenCalledWith(302, "/auth/login");
    expect(res.redirect).not.toHaveBeenCalledWith(301, expect.anything());
    expect(res.status).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() on a valid token instead of redirecting", async () => {
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      {
        user_id: 1,
        email: "user@example.com",
        session_id: "abcd",
        login_session_id: 42,
        typ: "access",
      },
      "test-signing-key",
    );
    find_unique.mockResolvedValue({ id: 1, email: "user@example.com" });

    const req = { cookies: { [ACCESS_TOKEN_COOKIE]: token } } as any;
    const res = makeRes();
    const next = vi.fn();

    await isAuthenticatedPage(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
