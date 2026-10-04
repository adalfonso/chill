/** @jest-environment node */
import crypto from "node:crypto";

import {
  HANDOFF_TTL_SECONDS,
  challengeFromState,
  isValidChallenge,
  nativeCallbackUrl,
  nativeState,
  redeemHandoff,
  storeHandoff,
} from "../server/lib/auth/NativeHandoff";

/** The SHA-256 challenge for a verifier, as the app computes it */
const challengeFor = (verifier: string): string =>
  crypto.createHash("sha256").update(verifier).digest("base64url");

/**
 * A minimal in-memory stand-in for the Redis commands the handoff uses,
 * recording the TTL each entry was written with. `getDel` removes the entry
 * as it reads it, which is the property the single-use guarantee relies on.
 */
const makeCache = () => {
  const entries = new Map<string, { value: string; ttl?: number }>();

  return {
    entries,
    set: jest.fn(async (key: string, value: string, opts?: { EX?: number }) => {
      entries.set(key, { value, ttl: opts?.EX });
      return "OK";
    }),
    getDel: jest.fn(async (key: string) => {
      const entry = entries.get(key);
      entries.delete(key);
      return entry?.value ?? null;
    }),
  } as any;
};

const verifier = "a-secret-verifier-only-the-app-knows";
const challenge = challengeFor(verifier);

const tokens = {
  access_token: "access.jwt.value",
  refresh_token: "opaque-refresh-token",
  challenge,
};

describe("isValidChallenge", () => {
  it("accepts a base64url SHA-256 digest", () => {
    expect(challenge).toHaveLength(43);
    expect(isValidChallenge(challenge)).toBe(true);
  });

  it.each([
    ["undefined", undefined],
    ["a number", 42],
    ["an array", [challenge]],
    ["too short", "abc"],
    ["too long", `${challenge}x`],
    ["standard-base64 characters", `${challenge.slice(0, 42)}+`],
    ["empty", ""],
  ])("rejects %s", (_label, value) => {
    expect(isValidChallenge(value)).toBe(false);
  });
});

describe("nativeState / challengeFromState", () => {
  it("round-trips a challenge through the OAuth state", () => {
    expect(challengeFromState(nativeState(challenge))).toBe(challenge);
  });

  it("reads a web login (no state) as not native", () => {
    expect(challengeFromState(undefined)).toBeUndefined();
  });

  it("reads the old fixed 'native' state as not native", () => {
    expect(challengeFromState("native")).toBeUndefined();
  });

  it("reads a prefixed state with a malformed challenge as not native", () => {
    expect(challengeFromState("native.too-short")).toBeUndefined();
  });

  it("reads a non-string state (repeated query param) as not native", () => {
    expect(challengeFromState([nativeState(challenge)])).toBeUndefined();
  });
});

describe("nativeCallbackUrl", () => {
  it("carries only the code on success", () => {
    expect(nativeCallbackUrl("abc_123")).toBe(
      "com.adalfonso.chill://auth/callback?code=abc_123",
    );
  });

  it("reports failure when there is no code", () => {
    expect(nativeCallbackUrl()).toBe(
      "com.adalfonso.chill://auth/callback?failure=true",
    );
  });

  it("encodes a code that contains reserved characters", () => {
    expect(nativeCallbackUrl("a&b=c")).toBe(
      "com.adalfonso.chill://auth/callback?code=a%26b%3Dc",
    );
  });
});

describe("storeHandoff", () => {
  it("holds the tokens behind a code with a short TTL", async () => {
    const cache = makeCache();

    const code = await storeHandoff(cache)(tokens);

    expect(cache.set).toHaveBeenCalledTimes(1);
    const [key, value, opts] = cache.set.mock.calls[0];
    expect(key).toContain(code);
    expect(JSON.parse(value)).toEqual(tokens);
    expect(opts).toEqual({ EX: HANDOFF_TTL_SECONDS });
  });

  it("does not put the tokens in the code", async () => {
    const code = await storeHandoff(makeCache())(tokens);

    expect(code).not.toContain(tokens.access_token);
    expect(code).not.toContain(tokens.refresh_token);
  });

  it("issues a different code each time", async () => {
    const cache = makeCache();

    const first = await storeHandoff(cache)(tokens);
    const second = await storeHandoff(cache)(tokens);

    expect(first).not.toBe(second);
  });

  it("propagates a cache write failure", async () => {
    const cache = makeCache();
    cache.set.mockRejectedValue(new Error("redis down"));

    await expect(storeHandoff(cache)(tokens)).rejects.toThrow("redis down");
  });
});

describe("redeemHandoff", () => {
  it("returns the tokens for a correct code and verifier", async () => {
    const cache = makeCache();
    const code = await storeHandoff(cache)(tokens);

    await expect(redeemHandoff(cache)(code, verifier)).resolves.toEqual(tokens);
  });

  it("works at most once: a second redemption of the same code fails", async () => {
    const cache = makeCache();
    const code = await storeHandoff(cache)(tokens);

    await redeemHandoff(cache)(code, verifier);

    await expect(redeemHandoff(cache)(code, verifier)).resolves.toBeUndefined();
  });

  it("rejects an unknown or expired code", async () => {
    await expect(
      redeemHandoff(makeCache())("never-issued", verifier),
    ).resolves.toBeUndefined();
  });

  it("rejects the wrong verifier", async () => {
    const cache = makeCache();
    const code = await storeHandoff(cache)(tokens);

    await expect(
      redeemHandoff(cache)(code, "someone-elses-guess"),
    ).resolves.toBeUndefined();
  });

  it("burns the code on a wrong verifier, so the right one cannot follow", async () => {
    const cache = makeCache();
    const code = await storeHandoff(cache)(tokens);

    await redeemHandoff(cache)(code, "someone-elses-guess");

    await expect(redeemHandoff(cache)(code, verifier)).resolves.toBeUndefined();
  });

  it("propagates a cache read failure", async () => {
    const cache = makeCache();
    cache.getDel.mockRejectedValue(new Error("redis down"));

    await expect(redeemHandoff(cache)("code", verifier)).rejects.toThrow(
      "redis down",
    );
  });
});
