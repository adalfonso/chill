/** @jest-environment node */
import { AuthController } from "../server/controllers/AuthController";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "../server/lib/auth/cookies";

jest.mock("../server/init", () => ({
  env: { SIGNING_KEY: "test-signing-key", NODE_ENV: "test" },
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
  };
  return res;
};

beforeEach(() => {
  create.mockReset();
  revoke.mockReset();
  rotate.mockReset();
  find_unique.mockReset();
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
