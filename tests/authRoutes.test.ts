/** @vitest-environment node */
import crypto from "node:crypto";

import authRoutes from "../server/routes/auth";

// The controller is mocked out; these tests are about what the route layer
// does with the OAuth `state`, not what the controller does after it.
vi.mock(
  "@controllers/AuthController",
  () => ({
    AuthController: {
      loginPage: vi.fn(),
      loginScript: vi.fn(),
      logout: () => vi.fn(),
      refresh: () => vi.fn(),
      authCallback: vi.fn(),
      nativeTokenExchange: vi.fn(),
    },
  }),
);

vi.mock("../server/middleware/isAuthenticated", () => ({
  isAuthenticatedApi: vi.fn(),
}));

// `authenticate` returns the middleware passport would; the test captures the
// strategy options and the custom callback so it can drive both directly.
const mockAuthenticate = vi.fn();
vi.mock("passport", () => ({
  __esModule: true,
  default: { authenticate: (...args: unknown[]) => mockAuthenticate(...args) },
}));

const FAILURE_URL = "com.adalfonso.chill://auth/callback?failure=true";

const challenge = crypto
  .createHash("sha256")
  .update("verifier-only-the-app-knows")
  .digest("base64url");

/** The route handlers registered for a GET path, in order */
const getHandlers = (path: string): ((...args: any[]) => any)[] => {
  const router: any = authRoutes({} as any);
  const layer = router.stack.find(
    (l: any) => l.route?.path === path && l.route.methods.get,
  );

  return layer.route.stack.map((l: any) => l.handle);
};

const makeRes = () => {
  const res: any = {
    status: vi.fn().mockImplementation(() => res),
    send: vi.fn().mockImplementation(() => res),
    redirect: vi.fn().mockImplementation(() => res),
  };
  return res;
};

beforeEach(() => {
  mockAuthenticate.mockReset();
  mockAuthenticate.mockImplementation(() => vi.fn());
});

describe("GET /auth/google", () => {
  const [handler] = getHandlers("/google");

  it("threads a native login's challenge into the OAuth state", () => {
    handler({ query: { platform: "native", challenge } }, makeRes(), vi.fn());

    expect(mockAuthenticate).toHaveBeenCalledWith("google", {
      scope: ["email", "profile"],
      state: `native.${challenge}`,
    });
  });

  it("leaves state unset for a web login", () => {
    handler({ query: {} }, makeRes(), vi.fn());

    expect(mockAuthenticate).toHaveBeenCalledWith("google", {
      scope: ["email", "profile"],
      state: undefined,
    });
  });

  it.each([
    ["missing", {}],
    ["malformed", { challenge: "short" }],
    ["repeated", { challenge: [challenge, challenge] }],
  ])("rejects a native login with a %s challenge", (_label, extra) => {
    const res = makeRes();

    handler({ query: { platform: "native", ...extra } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });
});

describe("GET /auth/google/cb", () => {
  const [handler] = getHandlers("/google/cb");

  /** Run the route's handler and return the callback it gave passport */
  const run = (state: unknown, res = makeRes(), next = vi.fn()) => {
    const req: any = { query: { state } };
    handler(req, res, next);

    const [strategy, options, callback] = mockAuthenticate.mock.calls[0];
    return { req, res, next, strategy, options, callback };
  };

  it("asks passport not to use sessions, with its own failure handling", () => {
    const { strategy, options } = run(undefined);

    expect(strategy).toBe("google");
    expect(options).toEqual({ session: false });
  });

  it("on success, attaches the user and continues to the controller", () => {
    const { req, next, callback } = run(`native.${challenge}`);
    const user = { id: 1, email: "a@example.com" };

    callback(null, user);

    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalledWith();
  });

  it("deep-links back to the app when a native login is denied", () => {
    const { res, next, callback } = run(`native.${challenge}`);

    callback(null, false);

    expect(res.redirect).toHaveBeenCalledWith(FAILURE_URL);
    expect(next).not.toHaveBeenCalled();
  });

  it("deep-links back to the app when a native login errors", () => {
    const { res, next, callback } = run(`native.${challenge}`);

    callback(new Error("token exchange failed"), false);

    expect(res.redirect).toHaveBeenCalledWith(FAILURE_URL);
    expect(next).not.toHaveBeenCalled();
  });

  it("redirects a denied web login to the login page", () => {
    const { res, callback } = run(undefined);

    callback(null, false);

    expect(res.redirect).toHaveBeenCalledWith("/auth/login?failure=true");
  });

  it("hands a web login's error to the error handler", () => {
    const { res, next, callback } = run(undefined);
    const err = new Error("token exchange failed");

    callback(err, false);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it("treats a malformed native state as a web login", () => {
    const { res, callback } = run("native.not-a-challenge");

    callback(null, false);

    expect(res.redirect).toHaveBeenCalledWith("/auth/login?failure=true");
  });
});
