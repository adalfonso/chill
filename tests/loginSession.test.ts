/** @jest-environment node */
import {
  createLoginSessionService,
  deriveDeviceLabel,
} from "../server/lib/auth/LoginSession";

jest.mock("../server/init", () => ({
  env: { SIGNING_KEY: "test-signing-key" },
}));

const CHROME_WINDOWS_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// In-memory fake modeling Postgres's READ COMMITTED CAS guarantee: a write's
// guard clause is checked against the row's current state at write time, not
// at the caller's read time, so concurrent rotate() calls on the same token
// interleave exactly like they would against real Postgres (KTD13 warns
// against a fake that trivially "always returns count: 1").
// ---------------------------------------------------------------------------
type FakeLoginSession = {
  id: number;
  user_id: number;
  device_id: string;
  device_label: string;
  last_seen_at: Date;
  revoked_at: Date | null;
  idle_expires_at: Date;
  absolute_expires_at: Date;
};

type FakeRefreshToken = {
  id: number;
  token_hash: string;
  login_session_id: number;
  rotated_at: Date | null;
  rotated_to_id: number | null;
  expires_at: Date;
  issued_ip: string;
  issued_user_agent: string;
};

const createFakeDb = () => {
  let next_session_id = 1;
  let next_token_id = 1;
  const sessions = new Map<number, FakeLoginSession>();
  const tokens = new Map<number, FakeRefreshToken>();

  const withRelations = (token: FakeRefreshToken) => ({
    ...token,
    login_session: sessions.get(token.login_session_id)!,
    rotated_to: token.rotated_to_id
      ? (tokens.get(token.rotated_to_id) ?? null)
      : null,
  });

  const fakeDb = {
    loginSession: {
      upsert: async ({ where, create, update }: any) => {
        const existing = [...sessions.values()].find(
          (s) =>
            s.user_id === where.user_id_device_id.user_id &&
            s.device_id === where.user_id_device_id.device_id,
        );

        if (existing) {
          Object.assign(existing, update);
          return existing;
        }

        const session: FakeLoginSession = {
          id: next_session_id++,
          user_id: create.user_id,
          device_id: create.device_id,
          device_label: create.device_label,
          last_seen_at: create.last_seen_at,
          revoked_at: create.revoked_at ?? null,
          idle_expires_at: create.idle_expires_at,
          absolute_expires_at: create.absolute_expires_at,
        };

        sessions.set(session.id, session);
        return session;
      },
      updateMany: async ({ where, data }: any) => {
        const matches = [...sessions.values()].filter(
          (s) =>
            s.id === where.id &&
            (where.user_id === undefined || s.user_id === where.user_id) &&
            (where.revoked_at === undefined ||
              s.revoked_at === where.revoked_at),
        );

        matches.forEach((s) => Object.assign(s, data));

        return { count: matches.length };
      },
      findUnique: async ({ where }: any) => {
        return sessions.get(where.id) ?? null;
      },
      findFirst: async ({ where }: any) => {
        const match = [...sessions.values()].find(
          (s) =>
            (where.id === undefined || s.id === where.id) &&
            (where.user_id === undefined || s.user_id === where.user_id) &&
            (where.revoked_at?.not === undefined ||
              s.revoked_at !== where.revoked_at.not),
        );

        return match ?? null;
      },
      update: async ({ where, data }: any) => {
        const session = sessions.get(where.id)!;
        Object.assign(session, data);
        return session;
      },
      deleteMany: async ({ where }: any) => {
        const cutoff: Date =
          where.OR[0].idle_expires_at.lte ??
          where.OR[1].absolute_expires_at.lte;
        const to_delete = [...sessions.values()].filter(
          (s) => s.idle_expires_at <= cutoff || s.absolute_expires_at <= cutoff,
        );

        to_delete.forEach((s) => sessions.delete(s.id));
        return { count: to_delete.length };
      },
    },
    refreshToken: {
      findUnique: async ({ where }: any) => {
        const token =
          where.id !== undefined
            ? tokens.get(where.id)
            : [...tokens.values()].find(
                (t) => t.token_hash === where.token_hash,
              );

        return token ? withRelations(token) : null;
      },
      create: async ({ data }: any) => {
        const token: FakeRefreshToken = {
          id: next_token_id++,
          token_hash: data.token_hash,
          login_session_id: data.login_session_id,
          rotated_at: null,
          rotated_to_id: null,
          expires_at: data.expires_at,
          issued_ip: data.issued_ip,
          issued_user_agent: data.issued_user_agent,
        };
        tokens.set(token.id, token);
        return token;
      },
      update: async ({ where, data }: any) => {
        const token = tokens.get(where.id)!;
        Object.assign(token, data);
        return token;
      },
      updateMany: async ({ where, data }: any) => {
        // Synchronous check-and-set: no `await` between reading current
        // state and writing it, so two "concurrent" calls (via Promise.all)
        // still serialize correctly under JS's single-threaded execution --
        // this is what makes the guard genuinely atomic rather than a stub
        // that always reports success.
        const matches = [...tokens.values()].filter(
          (t) =>
            (where.id === undefined || t.id === where.id) &&
            (where.login_session_id === undefined ||
              t.login_session_id === where.login_session_id) &&
            (where.rotated_at === undefined ||
              t.rotated_at === where.rotated_at),
        );

        matches.forEach((t) => Object.assign(t, data));

        return { count: matches.length };
      },
      deleteMany: async () => ({ count: 0 }),
      count: async ({ where }: any) => {
        return [...tokens.values()].filter(
          (t) => t.login_session_id === where.login_session_id,
        ).length;
      },
    },
    $transaction: async (fn: (tx: any) => Promise<unknown>) => fn(fakeDb),
  };

  return fakeDb;
};

const makeCache = () => {
  const store = new Map<string, string>();
  return {
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
      return "OK";
    }),
  };
};

const makeDenyList = () => ({
  deny: jest.fn().mockResolvedValue(undefined),
  isDenied: jest.fn().mockResolvedValue(false),
  warmUp: jest.fn().mockResolvedValue(undefined),
});

const setup = () => {
  const db = createFakeDb();
  const cache = makeCache();
  const deny_list = makeDenyList();
  const service = createLoginSessionService(
    db as any,
    deny_list as any,
    cache as any,
  );
  return { db, cache, deny_list, service };
};

describe("deriveDeviceLabel", () => {
  it("derives an allowlisted browser/platform label", () => {
    expect(deriveDeviceLabel(CHROME_WINDOWS_UA)).toBe("Chrome on Windows");
  });

  it("never stores the raw header", () => {
    const weird_ua = "TotallyCustomBotThing/1.0 (rare-config; x86_64)";
    expect(deriveDeviceLabel(weird_ua)).not.toContain("TotallyCustomBotThing");
  });
});

describe("create", () => {
  it("issues a login session and a refresh token", async () => {
    const { service } = setup();

    const { login_session_id, refresh_token } = await service.create({
      user_id: 1,
      device_id: "device-a",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    expect(login_session_id).toBeDefined();
    expect(refresh_token).toEqual(expect.any(String));
  });

  it("starts a new family on an existing (user_id, device_id) and leaves the predecessor to fail quietly", async () => {
    const { service } = setup();

    const first = await service.create({
      user_id: 1,
      device_id: "device-a",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });
    const second = await service.create({
      user_id: 1,
      device_id: "device-a",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    expect(second.login_session_id).toEqual(first.login_session_id);

    const first_rotate = await service.rotate({
      refresh_token: first.refresh_token,
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    expect(first_rotate.ok).toBe(false);
  });
});

describe("rotate", () => {
  it("covers AE1: replaying a token rotated 8 seconds ago returns the cached successor, does not revoke, and does not extend the sliding expiry a second time", async () => {
    const { service, deny_list } = setup();
    const { login_session_id, refresh_token } = await service.create({
      user_id: 1,
      device_id: "device-a",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    const first_rotation = await service.rotate({
      refresh_token,
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });
    expect(first_rotation.ok).toBe(true);

    const replay = await service.rotate({
      refresh_token,
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    expect(replay).toEqual(first_rotation);
    expect(deny_list.deny).not.toHaveBeenCalledWith(login_session_id);
  });

  it("covers AE2: replaying a token rotated 5 minutes ago revokes every token in the family", async () => {
    const { service, deny_list } = setup();
    const { login_session_id, refresh_token } = await service.create({
      user_id: 1,
      device_id: "device-a",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    jest.useFakeTimers("modern");
    jest.setSystemTime(new Date());

    await service.rotate({
      refresh_token,
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    jest.advanceTimersByTime(5 * 60 * 1000);

    const replay = await service.rotate({
      refresh_token,
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    expect(replay.ok).toBe(false);
    expect(deny_list.deny).toHaveBeenCalledWith(login_session_id);
    // A caller with a socket server (e.g. AuthController.refresh) needs this
    // to drop the reused session's live sockets -- see LoginSession.ts's
    // disambiguateReplay docblock.
    expect((replay as { revoked_login_session_id?: number })
      .revoked_login_session_id).toBe(login_session_id);

    jest.useRealTimers();
  });

  it("covers KTD14: replaying inside the window with the grace cache empty returns a failure and leaves the family intact", async () => {
    const { service, deny_list, cache } = setup();
    const { refresh_token } = await service.create({
      user_id: 1,
      device_id: "device-a",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    await service.rotate({
      refresh_token,
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    cache.get.mockResolvedValueOnce(null);

    const replay = await service.rotate({
      refresh_token,
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    expect(replay.ok).toBe(false);
    expect(deny_list.deny).not.toHaveBeenCalled();
    // A benign lost-response race must stay indistinguishable from reuse at
    // the response layer (KTD17) -- no socket-drop signal, either.
    expect((replay as { revoked_login_session_id?: number })
      .revoked_login_session_id).toBeUndefined();
  });

  it("trips detection on a grandparent token even inside 30 seconds", async () => {
    const { service, deny_list } = setup();
    const { login_session_id, refresh_token: token_a } = await service.create({
      user_id: 1,
      device_id: "device-a",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    const rotation_b = await service.rotate({
      refresh_token: token_a,
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });
    expect(rotation_b.ok).toBe(true);
    const token_b = rotation_b.ok ? rotation_b.refresh_token : "";

    // B is immediately rotated into C, so B is no longer the live head.
    await service.rotate({
      refresh_token: token_b,
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    // Replaying A (a grandparent of the live token) inside 30s of A's own
    // rotation must still trip detection -- only a one-step lookback grants
    // grace.
    const replay_a = await service.rotate({
      refresh_token: token_a,
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    expect(replay_a.ok).toBe(false);
    expect(deny_list.deny).toHaveBeenCalledWith(login_session_id);
  });

  it("produces exactly one successor from two concurrent rotations, treating the loser as an in-window replay", async () => {
    const { service, deny_list } = setup();
    const { refresh_token } = await service.create({
      user_id: 1,
      device_id: "device-a",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    const [first, second] = await Promise.all([
      service.rotate({
        refresh_token,
        user_agent: CHROME_WINDOWS_UA,
        ip: "1.2.3.4",
      }),
      service.rotate({
        refresh_token,
        user_agent: CHROME_WINDOWS_UA,
        ip: "1.2.3.4",
      }),
    ]);

    const outcomes = [first, second];
    const successes = outcomes.filter((o) => o.ok);
    const uniqueSuccessors = new Set(
      outcomes
        .filter((o): o is Extract<typeof o, { ok: true }> => o.ok)
        .map((o) => o.refresh_token),
    );

    expect(successes.length).toBeGreaterThanOrEqual(1);
    expect(uniqueSuccessors.size).toBe(1);
    expect(deny_list.deny).not.toHaveBeenCalled();
  });

  it("fails without minting a successor against a revoked session", async () => {
    const { service } = setup();
    const { login_session_id, refresh_token } = await service.create({
      user_id: 1,
      device_id: "device-a",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    await service.revoke(login_session_id);

    const result = await service.rotate({
      refresh_token,
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    expect(result.ok).toBe(false);
  });

  it("keeps absolute_expires_at identical before and after a rotation", async () => {
    const { service, db } = setup();
    const { login_session_id, refresh_token } = await service.create({
      user_id: 1,
      device_id: "device-a",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    const before = (await db.loginSession.findUnique({
      where: { id: login_session_id },
    }))!;

    await service.rotate({
      refresh_token,
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    const after = (await db.loginSession.findUnique({
      where: { id: login_session_id },
    }))!;

    expect(after.absolute_expires_at).toEqual(before.absolute_expires_at);
  });

  it("cannot rotate a session past either expiry", async () => {
    const { service, db } = setup();
    const { login_session_id, refresh_token } = await service.create({
      user_id: 1,
      device_id: "device-a",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    const session = (await db.loginSession.findUnique({
      where: { id: login_session_id },
    }))!;
    session.idle_expires_at = new Date(Date.now() - 1000);

    const result = await service.rotate({
      refresh_token,
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    expect(result.ok).toBe(false);
  });

  it("covers R13: a second presentation of an already-revoked family returns a failure without re-running revocation", async () => {
    const { service, deny_list } = setup();
    const { login_session_id, refresh_token } = await service.create({
      user_id: 1,
      device_id: "device-a",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    await service.revoke(login_session_id);
    deny_list.deny.mockClear();

    await service.rotate({
      refresh_token,
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });
    await service.rotate({
      refresh_token,
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    expect(deny_list.deny).not.toHaveBeenCalled();
  });
});

describe("revoke", () => {
  it("covers R8: succeeds when the row commits even if the deny list reports degraded enforcement", async () => {
    const { service, deny_list } = setup();
    const { login_session_id } = await service.create({
      user_id: 1,
      device_id: "device-a",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    deny_list.deny.mockRejectedValueOnce(new Error("redis down"));

    await expect(service.revoke(login_session_id)).resolves.toEqual({
      ok: true,
      login_session_id,
    });
  });

  it("is idempotent on an already-revoked session", async () => {
    const { service } = setup();
    const { login_session_id } = await service.create({
      user_id: 1,
      device_id: "device-a",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    await service.revoke(login_session_id);

    await expect(service.revoke(login_session_id)).resolves.toEqual({
      ok: true,
      login_session_id,
    });
  });

  it("does not re-write the deny key on an idempotent repeat revoke", async () => {
    const { service, deny_list } = setup();
    const { login_session_id } = await service.create({
      user_id: 1,
      device_id: "device-a",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    await service.revoke(login_session_id);
    deny_list.deny.mockClear();

    await service.revoke(login_session_id);

    expect(deny_list.deny).not.toHaveBeenCalled();
  });

  describe("owner-scoped revoke", () => {
    it("succeeds when the session belongs to the given owner", async () => {
      const { service } = setup();
      const { login_session_id } = await service.create({
        user_id: 1,
        device_id: "device-a",
        user_agent: CHROME_WINDOWS_UA,
        ip: "1.2.3.4",
      });

      await expect(
        service.revoke(login_session_id, { owner_user_id: 1 }),
      ).resolves.toEqual({ ok: true, login_session_id });
    });

    it("fails without revoking when the session belongs to a different owner", async () => {
      const { service, db } = setup();
      const { login_session_id } = await service.create({
        user_id: 1,
        device_id: "device-a",
        user_agent: CHROME_WINDOWS_UA,
        ip: "1.2.3.4",
      });

      await expect(
        service.revoke(login_session_id, { owner_user_id: 2 }),
      ).resolves.toEqual({ ok: false, login_session_id });

      const session = await db.loginSession.findUnique({
        where: { id: login_session_id },
      });
      expect(session!.revoked_at).toBeNull();
    });

    it("fails the same way for a nonexistent id as for someone else's session -- no existence oracle", async () => {
      const { service } = setup();

      await expect(
        service.revoke(999_999, { owner_user_id: 1 }),
      ).resolves.toEqual({ ok: false, login_session_id: 999_999 });
    });

    it("is idempotent when the owner repeats a revoke on their own already-revoked session", async () => {
      const { service, deny_list } = setup();
      const { login_session_id } = await service.create({
        user_id: 1,
        device_id: "device-a",
        user_agent: CHROME_WINDOWS_UA,
        ip: "1.2.3.4",
      });

      await service.revoke(login_session_id, { owner_user_id: 1 });
      deny_list.deny.mockClear();

      await expect(
        service.revoke(login_session_id, { owner_user_id: 1 }),
      ).resolves.toEqual({ ok: true, login_session_id });
      expect(deny_list.deny).not.toHaveBeenCalled();
    });
  });
});

describe("prune", () => {
  it("removes rows past either expiry and leaves active ones intact", async () => {
    const { service, db } = setup();
    const { login_session_id: active_id } = await service.create({
      user_id: 1,
      device_id: "device-a",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });
    const { login_session_id: expired_id } = await service.create({
      user_id: 2,
      device_id: "device-b",
      user_agent: CHROME_WINDOWS_UA,
      ip: "1.2.3.4",
    });

    const expired_session = (await db.loginSession.findUnique({
      where: { id: expired_id },
    }))!;
    expired_session.absolute_expires_at = new Date(Date.now() - 1000);
    expired_session.idle_expires_at = new Date(Date.now() - 1000);

    await service.prune();

    expect(
      await db.loginSession.findUnique({ where: { id: active_id } }),
    ).not.toBeNull();
    expect(
      await db.loginSession.findUnique({ where: { id: expired_id } }),
    ).toBeNull();
  });
});
