/** @jest-environment node */
import { LoginSessionController } from "../server/controllers/LoginSessionController";

jest.mock("../server/init", () => ({
  env: { SIGNING_KEY: "test-signing-key" },
}));

const revoke = jest.fn();
const find_unique = jest.fn();
const find_many = jest.fn();

jest.mock("../server/lib/data/db", () => ({
  db: {
    loginSession: {
      findUnique: (...args: unknown[]) => find_unique(...args),
      findMany: (...args: unknown[]) => find_many(...args),
    },
  },
}));

jest.mock("../server/lib/auth/LoginSession", () => ({
  loginSessionService: {
    instance: () => ({ revoke: (...args: unknown[]) => revoke(...args) }),
  },
}));

const makeWss = () => ({ dropByLoginSession: jest.fn() });
const makeReq = (wss: ReturnType<typeof makeWss>): any => ({
  app: { _wss: wss },
});

beforeEach(() => {
  revoke.mockReset();
  find_unique.mockReset();
  find_many.mockReset();
});

describe("LoginSessionController.revoke", () => {
  it("drops the session's sockets when the owned revoke succeeds", async () => {
    revoke.mockResolvedValue({ ok: true, login_session_id: 5 });
    const wss = makeWss();

    await LoginSessionController.revoke({
      ctx: {
        req: makeReq(wss),
        res: {} as any,
        token: { user_id: 1, login_session_id: 99 } as any,
      },
      input: { login_session_id: 5 },
    } as any);

    expect(revoke).toHaveBeenCalledWith(5, { owner_user_id: 1 });
    expect(wss.dropByLoginSession).toHaveBeenCalledWith(5);
  });

  it("throws UNAUTHORIZED and drops no socket for a session it doesn't own", async () => {
    revoke.mockResolvedValue({ ok: false, login_session_id: 5 });
    const wss = makeWss();

    await expect(
      LoginSessionController.revoke({
        ctx: {
          req: makeReq(wss),
          res: {} as any,
          token: { user_id: 1, login_session_id: 99 } as any,
        },
        input: { login_session_id: 5 },
      } as any),
    ).rejects.toThrow();

    expect(wss.dropByLoginSession).not.toHaveBeenCalled();
  });
});

describe("LoginSessionController.revokeOthers", () => {
  it("drops sockets for every other session and never for the caller's own", async () => {
    find_unique.mockResolvedValue({ revoked_at: null });
    find_many.mockResolvedValue([{ id: 2 }, { id: 3 }]);
    revoke.mockResolvedValue({ ok: true, login_session_id: 0 });
    const wss = makeWss();

    const result = await LoginSessionController.revokeOthers({
      ctx: {
        req: makeReq(wss),
        res: {} as any,
        token: { user_id: 1, login_session_id: 99 } as any,
      },
      input: undefined,
    } as any);

    expect(result).toEqual({ revoked_count: 2 });
    expect(wss.dropByLoginSession).toHaveBeenCalledWith(2);
    expect(wss.dropByLoginSession).toHaveBeenCalledWith(3);
    expect(wss.dropByLoginSession).not.toHaveBeenCalledWith(99);
    expect(find_many).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ user_id: 1, id: { not: 99 } }),
      }),
    );
  });

  it("throws UNAUTHORIZED without revoking or dropping anything when the caller's own session is already revoked", async () => {
    find_unique.mockResolvedValue({ revoked_at: new Date() });
    const wss = makeWss();

    await expect(
      LoginSessionController.revokeOthers({
        ctx: {
          req: makeReq(wss),
          res: {} as any,
          token: { user_id: 1, login_session_id: 99 } as any,
        },
        input: undefined,
      } as any),
    ).rejects.toThrow();

    expect(revoke).not.toHaveBeenCalled();
    expect(wss.dropByLoginSession).not.toHaveBeenCalled();
  });
});
