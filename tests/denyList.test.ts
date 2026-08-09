/** @jest-environment node */
import { createDenyList } from "../server/lib/auth/DenyList";

jest.mock("../server/controllers/AuthController", () => ({
  jwt_expiration_seconds: 3600 * 12,
}));

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

const makeClient = (
  overrides: Partial<{ get: jest.Mock; set: jest.Mock }> = {},
) => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
  ...overrides,
});

beforeEach(() => {
  find_unique.mockReset();
  find_many.mockReset();
});

describe("deny", () => {
  it("writes a deny key with a TTL matching the access-token lifetime", async () => {
    const client = makeClient();
    const deny_list = createDenyList(client);

    await deny_list.deny(42);

    expect(client.set).toHaveBeenCalledWith(
      expect.stringContaining("42"),
      expect.any(String),
      { EX: 3600 * 12 },
    );
  });

  it("surfaces a rejected write as a thrown error", async () => {
    const client = makeClient({
      set: jest.fn().mockRejectedValue(new Error("redis down")),
    });
    const deny_list = createDenyList(client);

    await expect(deny_list.deny(42)).rejects.toThrow("redis down");
  });
});

describe("isDenied", () => {
  it("denies a login session with a deny key set", async () => {
    const client = makeClient({ get: jest.fn().mockResolvedValue("1") });
    const deny_list = createDenyList(client);

    await expect(deny_list.isDenied(42)).resolves.toBe(true);
  });

  it("does not deny an unrelated login session", async () => {
    const client = makeClient();
    const deny_list = createDenyList(client);

    await expect(deny_list.isDenied(7)).resolves.toBe(false);
  });

  it("falls back to Postgres on a read timeout and reports the row's revoked state", async () => {
    const client = makeClient({
      get: jest.fn(() => new Promise(() => {})), // never resolves
    });
    const deny_list = createDenyList(client, { read_timeout_ms: 10 });
    find_unique.mockResolvedValue({ revoked_at: new Date() });

    await expect(deny_list.isDenied(42)).resolves.toBe(true);
    expect(find_unique).toHaveBeenCalledWith({
      where: { id: 42 },
      select: { revoked_at: true },
    });
  });

  it("falls back to Postgres on a read error and reports an active session as not denied", async () => {
    const client = makeClient({
      get: jest.fn().mockRejectedValue(new Error("connection reset")),
    });
    const deny_list = createDenyList(client);
    find_unique.mockResolvedValue({ revoked_at: null });

    await expect(deny_list.isDenied(42)).resolves.toBe(false);
  });

  it("opens the circuit after repeated failures and stops hammering Redis", async () => {
    const get = jest.fn().mockRejectedValue(new Error("connection reset"));
    const client = makeClient({ get });
    const deny_list = createDenyList(client, {
      failure_threshold: 2,
      circuit_cooldown_ms: 10_000,
    });
    find_unique.mockResolvedValue({ revoked_at: null });

    await deny_list.isDenied(1);
    await deny_list.isDenied(2);
    await deny_list.isDenied(3);

    expect(get).toHaveBeenCalledTimes(2);
    expect(find_unique).toHaveBeenCalledTimes(3);
  });
});

describe("warmUp", () => {
  it("restores a deny key for every session revoked within the access-token lifetime", async () => {
    const client = makeClient();
    const deny_list = createDenyList(client);
    find_many.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await deny_list.warmUp();

    expect(client.set).toHaveBeenCalledTimes(2);
    expect(find_many).toHaveBeenCalledWith({
      where: { revoked_at: { gte: expect.any(Date) } },
      select: { id: true },
    });
  });

  it("skips sessions revoked before the access-token lifetime window", async () => {
    const client = makeClient();
    const deny_list = createDenyList(client);
    find_many.mockResolvedValue([]);

    await deny_list.warmUp();

    expect(client.set).not.toHaveBeenCalled();
  });
});
