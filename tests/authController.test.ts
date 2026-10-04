/** @jest-environment node */
import crypto from "node:crypto";

import { AuthController } from "../server/controllers/AuthController";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "../server/lib/auth/cookies";

jest.mock("../server/init", () => ({
  env: { SIGNING_KEY: "test-signing-key", NODE_ENV: "test" },
}));

// In-memory stand-in for the Redis commands the native handoff uses. `getDel`
// removes the entry as it reads it, which the single-use tests rely on. The
// `mock` prefix lets the hoisted jest.mock factory below reference these.
const mockHandoffStore = new Map<string, string>();
const mockCache = {
  set: jest.fn(async (key: string, value: string) => {
    mockHandoffStore.set(key, value);
    return "OK";
  }),
  getDel: jest.fn(async (key: string) => {
    const value = mockHandoffStore.get(key);
    mockHandoffStore.delete(key);
    return value ?? null;
  }),
};

jest.mock("../server/lib/data/Cache", () => ({
  Cache: { instance: () => mockCache },
}));

const create = jest.fn();
const revoke = jest.fn();
const rotate = jest.fn();
const find_unique = jest.fn();

jest.mock("../server/lib/data/db", () => ({
  db: {
    loginSession: {
      findUnique: (...args: unknown[]) => find_unique(...args),
    },
  },
}));

jest.mock("../server/lib/auth/LoginSession", () => ({
  loginSessionService: {
    instance: () => ({
      create: (...args: unknown[]) => create(...args),
      revoke: (...args: unknown[]) => revoke(...args),
      rotate: (...args: unknown[]) => rotate(...args),
    }),
  },
}));

const makeWss = () => ({
  dropByLoginSession: jest.fn(),
});

/** A minimal fake Express response, tracking cookie/status/json/redirect calls for assertions. */
const makeRes = () => {
  const res: any = {
    cookie: jest.fn().mockImplementation(() => res),
    clearCookie: jest.fn().mockImplementation(() => res),
    status: jest.fn().mockImplementation(() => res),
    json: jest.fn().mockImplementation(() => res),
    redirect: jest.fn().mockImplementation(() => res),
    sendFile: jest.fn().mockImplementation(() => res),
    send: jest.fn().mockImplementation(() => res),
  };
  return res;
};

beforeEach(() => {
  create.mockReset();
  revoke.mockReset();
  rotate.mockReset();
  find_unique.mockReset();
  mockHandoffStore.clear();
  mockCache.set.mockClear();
  mockCache.getDel.mockClear();
});

describe("AuthController.logout", () => {
  it("drops every socket on the login session, revokes it, and clears both cookies", async () => {
    revoke.mockResolvedValue({ ok: true, login_session_id: 5 });
    const wss = makeWss();
    const req: any = { _user: { login_session_id: 5, session_id: "dev1" } };
    const res = makeRes();

    await AuthController.logout(wss as any)(req, res);

    expect(wss.dropByLoginSession).toHaveBeenCalledWith(5);
    expect(revoke).toHaveBeenCalledWith(5, {});
    expect(res.clearCookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      expect.anything(),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE,
      expect.anything(),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("responds 500 and does not clear cookies when revocation fails", async () => {
    revoke.mockRejectedValue(new Error("db down"));
    const wss = makeWss();
    const req: any = { _user: { login_session_id: 5, session_id: "dev1" } };
    const res = makeRes();

    await AuthController.logout(wss as any)(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.clearCookie).not.toHaveBeenCalled();
  });
});

describe("AuthController.refresh", () => {
  const baseReq = (overrides: Record<string, unknown> = {}): any => ({
    headers: { "x-requested-with": "fetch" },
    cookies: { [REFRESH_TOKEN_COOKIE]: "plaintext-refresh-token" },
    ...overrides,
  });

  it("rejects with 400 when the anti-CSRF header is missing", async () => {
    const wss = makeWss();
    const res = makeRes();

    await AuthController.refresh(wss as any)(baseReq({ headers: {} }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(rotate).not.toHaveBeenCalled();
  });

  it("rejects with 401 when the refresh cookie is missing", async () => {
    const wss = makeWss();
    const res = makeRes();

    await AuthController.refresh(wss as any)(baseReq({ cookies: {} }), res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(rotate).not.toHaveBeenCalled();
  });

  it("on an ordinary rotation failure, responds 401 and does not touch any socket", async () => {
    rotate.mockResolvedValue({ ok: false });
    const wss = makeWss();
    const res = makeRes();

    await AuthController.refresh(wss as any)(baseReq(), res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(wss.dropByLoginSession).not.toHaveBeenCalled();
  });

  it("on a reuse-triggered revocation, drops the revoked session's sockets before responding 401", async () => {
    rotate.mockResolvedValue({ ok: false, revoked_login_session_id: 5 });
    const wss = makeWss();
    const res = makeRes();

    await AuthController.refresh(wss as any)(baseReq(), res);

    expect(wss.dropByLoginSession).toHaveBeenCalledWith(5);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("responds 500 (not an unhandled rejection) when rotate() throws", async () => {
    rotate.mockRejectedValue(new Error("postgres down"));
    const wss = makeWss();
    const res = makeRes();

    await AuthController.refresh(wss as any)(baseReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("responds 500 when the post-rotation login session lookup throws", async () => {
    rotate.mockResolvedValue({
      ok: true,
      login_session_id: 5,
      refresh_token: "successor-token",
    });
    find_unique.mockRejectedValue(new Error("postgres down"));
    const wss = makeWss();
    const res = makeRes();

    await AuthController.refresh(wss as any)(baseReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("responds 401 when the rotated session's user row is gone", async () => {
    rotate.mockResolvedValue({
      ok: true,
      login_session_id: 5,
      refresh_token: "successor-token",
    });
    find_unique.mockResolvedValue(null);
    const wss = makeWss();
    const res = makeRes();

    await AuthController.refresh(wss as any)(baseReq(), res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("on success, sets fresh cookies and responds 200", async () => {
    rotate.mockResolvedValue({
      ok: true,
      login_session_id: 5,
      refresh_token: "successor-token",
    });
    find_unique.mockResolvedValue({
      user: { id: 1, email: "a@example.com" },
    });
    const wss = makeWss();
    const res = makeRes();

    await AuthController.refresh(wss as any)(baseReq(), res);

    expect(res.cookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      expect.any(String),
      expect.anything(),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE,
      "successor-token",
      expect.anything(),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("AuthController.authCallback", () => {
  const baseReq = (overrides: Record<string, unknown> = {}): any => ({
    headers: {},
    cookies: {},
    ...overrides,
  });

  it("redirects to login when passport didn't attach req.user", async () => {
    const res = makeRes();

    await AuthController.authCallback(baseReq({ user: undefined }), res);

    expect(res.redirect).toHaveBeenCalledWith("/auth/login?failure=true");
    expect(create).not.toHaveBeenCalled();
  });

  it("redirects to login (not a 500) when session creation throws", async () => {
    create.mockRejectedValue(new Error("postgres down"));
    const res = makeRes();

    await AuthController.authCallback(
      baseReq({ user: { id: 1, email: "a@example.com" } }),
      res,
    );

    expect(res.redirect).toHaveBeenCalledWith("/auth/login?failure=true");
  });

  it("on success, sets both cookies and redirects to the app", async () => {
    create.mockResolvedValue({ login_session_id: 5, refresh_token: "tok" });
    const res = makeRes();

    await AuthController.authCallback(
      baseReq({ user: { id: 1, email: "a@example.com" } }),
      res,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      expect.any(String),
      expect.anything(),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE,
      "tok",
      expect.anything(),
    );
    expect(res.redirect).toHaveBeenCalledWith("/");
  });
});

describe("AuthController.authCallback (native login)", () => {
  const verifier = "verifier-only-the-app-knows";
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  const FAILURE_URL = "com.adalfonso.chill://auth/callback?failure=true";

  // The callback still sets the non-auth device_id cookie; what must never
  // happen is an auth cookie landing in the Custom Tab's own cookie jar.
  const expectNoAuthCookies = (res: any) => {
    const names = res.cookie.mock.calls.map(([name]: [string]) => name);

    expect(names).not.toContain(ACCESS_TOKEN_COOKIE);
    expect(names).not.toContain(REFRESH_TOKEN_COOKIE);
  };

  const nativeReq = (overrides: Record<string, unknown> = {}): any => ({
    headers: {},
    cookies: {},
    query: { state: `native.${challenge}` },
    user: { id: 1, email: "a@example.com" },
    ...overrides,
  });

  it("deep-links back with a code, never the tokens, and sets no cookies", async () => {
    create.mockResolvedValue({ login_session_id: 5, refresh_token: "tok" });
    const res = makeRes();

    await AuthController.authCallback(nativeReq(), res);

    const [url] = res.redirect.mock.calls[0];
    expect(url).toMatch(
      /^com\.adalfonso\.chill:\/\/auth\/callback\?code=[A-Za-z0-9_-]+$/,
    );
    expect(url).not.toContain("tok");
    expectNoAuthCookies(res);
  });

  it("parks the tokens, bound to the app's challenge, behind that code", async () => {
    create.mockResolvedValue({ login_session_id: 5, refresh_token: "tok" });
    const res = makeRes();

    await AuthController.authCallback(nativeReq(), res);

    const code = new URL(res.redirect.mock.calls[0][0]).searchParams.get(
      "code",
    );
    const stored = JSON.parse(
      [...mockHandoffStore.entries()].find(([key]) => key.includes(code!))![1],
    );
    expect(stored).toEqual({
      access_token: expect.any(String),
      refresh_token: "tok",
      challenge,
    });
  });

  it("deep-links a failure when passport didn't attach req.user", async () => {
    const res = makeRes();

    await AuthController.authCallback(nativeReq({ user: undefined }), res);

    expect(res.redirect).toHaveBeenCalledWith(FAILURE_URL);
    expect(create).not.toHaveBeenCalled();
  });

  it("deep-links a failure when session creation throws", async () => {
    create.mockRejectedValue(new Error("postgres down"));
    const res = makeRes();

    await AuthController.authCallback(nativeReq(), res);

    expect(res.redirect).toHaveBeenCalledWith(FAILURE_URL);
  });

  it("deep-links a failure when the handoff cannot be written to the cache", async () => {
    create.mockResolvedValue({ login_session_id: 5, refresh_token: "tok" });
    mockCache.set.mockRejectedValueOnce(new Error("redis down"));
    const res = makeRes();

    await AuthController.authCallback(nativeReq(), res);

    expect(res.redirect).toHaveBeenCalledWith(FAILURE_URL);
    expectNoAuthCookies(res);
  });

  it("treats a malformed native state as a web login", async () => {
    const res = makeRes();

    await AuthController.authCallback(
      nativeReq({
        user: undefined,
        query: { state: "native.not-a-challenge" },
      }),
      res,
    );

    expect(res.redirect).toHaveBeenCalledWith("/auth/login?failure=true");
  });
});

describe("AuthController.nativeTokenExchange", () => {
  const verifier = "verifier-only-the-app-knows";
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");

  /** Run the callback to mint a real handoff code, as the Custom Tab would */
  const mintCode = async (): Promise<string> => {
    create.mockResolvedValue({ login_session_id: 5, refresh_token: "tok" });
    const res = makeRes();

    await AuthController.authCallback(
      {
        headers: {},
        cookies: {},
        query: { state: `native.${challenge}` },
        user: { id: 1, email: "a@example.com" },
      } as any,
      res,
    );

    return new URL(res.redirect.mock.calls[0][0]).searchParams.get("code")!;
  };

  const exchangeReq = (
    body: unknown,
    headers: Record<string, string> = { "x-requested-with": "fetch" },
  ): any => ({ headers, body });

  it("requires the anti-CSRF header", async () => {
    const code = await mintCode();
    const res = makeRes();

    await AuthController.nativeTokenExchange(
      exchangeReq({ code, verifier }, {}),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.cookie).not.toHaveBeenCalled();
    expect(mockCache.getDel).not.toHaveBeenCalled();
  });

  it.each([
    ["no body", undefined],
    ["a missing verifier", { code: "abc" }],
    ["a missing code", { verifier: "abc" }],
    ["non-string values", { code: 1, verifier: { a: 1 } }],
  ])("responds 400 for %s", async (_label, body) => {
    const res = makeRes();

    await AuthController.nativeTokenExchange(exchangeReq(body), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("responds 401 for an unknown code", async () => {
    const res = makeRes();

    await AuthController.nativeTokenExchange(
      exchangeReq({ code: "never-issued", verifier }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("responds 401 for the wrong verifier, and burns the code", async () => {
    const code = await mintCode();
    const wrong = makeRes();

    await AuthController.nativeTokenExchange(
      exchangeReq({ code, verifier: "someone-elses-guess" }),
      wrong,
    );

    expect(wrong.status).toHaveBeenCalledWith(401);
    expect(wrong.cookie).not.toHaveBeenCalled();

    const retry = makeRes();
    await AuthController.nativeTokenExchange(
      exchangeReq({ code, verifier }),
      retry,
    );

    expect(retry.status).toHaveBeenCalledWith(401);
  });

  it("on success, sets both cookies and responds 204", async () => {
    const code = await mintCode();
    const res = makeRes();

    await AuthController.nativeTokenExchange(
      exchangeReq({ code, verifier }),
      res,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      expect.any(String),
      expect.anything(),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE,
      "tok",
      expect.anything(),
    );
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it("works at most once: a second redemption of the same code is rejected", async () => {
    const code = await mintCode();

    await AuthController.nativeTokenExchange(
      exchangeReq({ code, verifier }),
      makeRes(),
    );

    const second = makeRes();
    await AuthController.nativeTokenExchange(
      exchangeReq({ code, verifier }),
      second,
    );

    expect(second.status).toHaveBeenCalledWith(401);
    expect(second.cookie).not.toHaveBeenCalled();
  });

  it("responds 500 (not an unhandled rejection) when the cache read fails", async () => {
    mockCache.getDel.mockRejectedValueOnce(new Error("redis down"));
    const res = makeRes();

    await AuthController.nativeTokenExchange(
      exchangeReq({ code: "abc", verifier }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.cookie).not.toHaveBeenCalled();
  });
});
