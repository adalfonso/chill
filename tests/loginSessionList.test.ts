/** @jest-environment node */
import {
  LoginSessionController,
  toLoginSessionDto,
} from "../server/controllers/LoginSessionController";

jest.mock("../server/init", () => ({
  env: { SIGNING_KEY: "test-signing-key" },
}));

const find_many = jest.fn();

jest.mock("../server/lib/data/db", () => ({
  db: {
    loginSession: {
      findMany: (...args: unknown[]) => find_many(...args),
    },
  },
}));

jest.mock("../server/lib/auth/LoginSession", () => ({
  loginSessionService: { instance: () => ({ revoke: jest.fn() }) },
}));

beforeEach(() => {
  find_many.mockReset();
});

describe("toLoginSessionDto", () => {
  const row = {
    id: 1,
    device_label: "Chrome on Windows",
    created_at: new Date("2026-01-01T00:00:00Z"),
    last_seen_at: new Date("2026-01-02T00:00:00Z"),
  };

  it("never includes a token hash or device_id -- asserts on the key set", () => {
    const dto = toLoginSessionDto(row, 999);

    expect(Object.keys(dto).sort()).toEqual(
      [
        "created_at",
        "device_label",
        "id",
        "is_current_session",
        "last_refreshed_at",
      ].sort(),
    );
  });

  it("flags the row matching the current login session id", () => {
    expect(toLoginSessionDto(row, 1).is_current_session).toBe(true);
    expect(toLoginSessionDto(row, 2).is_current_session).toBe(false);
  });

  it("relabels last_seen_at as last_refreshed_at without renaming the value", () => {
    const dto = toLoginSessionDto(row, 1);

    expect(dto.last_refreshed_at).toEqual(row.last_seen_at);
  });
});

describe("LoginSessionController.list", () => {
  it("queries only the caller's own active, unexpired sessions", async () => {
    find_many.mockResolvedValue([]);

    const req = {} as any;
    await LoginSessionController.list({
      ctx: { req, res: {} as any, token: { id: 42, login_session_id: 7 } as any },
      input: undefined,
    } as any);

    expect(find_many).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user_id: 42,
          revoked_at: null,
          idle_expires_at: { gt: expect.any(Date) },
          absolute_expires_at: { gt: expect.any(Date) },
        }),
      }),
    );
  });

  it("never selects token material or device_id from the database", async () => {
    find_many.mockResolvedValue([]);

    const req = {} as any;
    await LoginSessionController.list({
      ctx: { req, res: {} as any, token: { id: 42, login_session_id: 7 } as any },
      input: undefined,
    } as any);

    const { select } = find_many.mock.calls[0][0];

    expect(select).not.toHaveProperty("device_id");
    expect(select).not.toHaveProperty("token_hash");
  });
});
