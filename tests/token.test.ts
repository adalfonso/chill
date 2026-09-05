/** @jest-environment node */
import jwt from "jsonwebtoken";

import {
  access_token_payload_schema,
  cast_token_payload_schema,
  generateRefreshToken,
  hashRefreshToken,
  verifyAndDecodeJwt,
} from "../server/lib/Token";

jest.mock("../server/init", () => ({
  env: { SIGNING_KEY: "test-signing-key" },
}));

const SIGNING_KEY = "test-signing-key";

const access_payload = {
  user_id: 1,
  email: "user@example.com",
  session_id: "abcd",
  login_session_id: 42,
  typ: "access" as const,
};

const cast_payload = {
  for: "user@example.com",
  track_id: 1,
  album_art_filename: "cover.jpg",
  login_session_id: 42,
  typ: "cast" as const,
};

describe("generateRefreshToken", () => {
  it("produces two different tokens on successive calls", () => {
    expect(generateRefreshToken()).not.toEqual(generateRefreshToken());
  });

  it("decodes to 32 bytes", () => {
    const token = generateRefreshToken();

    expect(Buffer.from(token, "base64url")).toHaveLength(32);
  });
});

describe("hashRefreshToken", () => {
  it("is deterministic", () => {
    const token = generateRefreshToken();

    expect(hashRefreshToken(token)).toEqual(hashRefreshToken(token));
  });

  it("changes when a single character of the token changes", () => {
    const token = generateRefreshToken();
    const flipped = (token[0] === "a" ? "b" : "a") + token.slice(1);

    expect(hashRefreshToken(token)).not.toEqual(hashRefreshToken(flipped));
  });
});

describe("verifyAndDecodeJwt", () => {
  it("parses a token matching the given schema", async () => {
    const token = jwt.sign(access_payload, SIGNING_KEY);

    await expect(
      verifyAndDecodeJwt(token, access_token_payload_schema),
    ).resolves.toEqual(access_payload);
  });

  it("rejects a valid cast token verified against the access schema", async () => {
    const token = jwt.sign(cast_payload, SIGNING_KEY);

    await expect(
      verifyAndDecodeJwt(token, access_token_payload_schema),
    ).rejects.toThrow();
  });

  it("rejects a valid access token verified against the cast schema", async () => {
    const token = jwt.sign(access_payload, SIGNING_KEY);

    await expect(
      verifyAndDecodeJwt(token, cast_token_payload_schema),
    ).rejects.toThrow();
  });

  it("rejects an access-token payload missing login_session_id", async () => {
    const { login_session_id: _login_session_id, ...incomplete } =
      access_payload;
    const token = jwt.sign(incomplete, SIGNING_KEY);

    await expect(
      verifyAndDecodeJwt(token, access_token_payload_schema),
    ).rejects.toThrow();
  });

  it("rejects a token signed with a non-HS256 algorithm", async () => {
    // HS384 is a different HMAC algorithm keyed the same way, so this proves
    // the pinned `algorithms: ["HS256"]` rejects it rather than the secret.
    const token = jwt.sign(access_payload, SIGNING_KEY, {
      algorithm: "HS384",
    });

    await expect(
      verifyAndDecodeJwt(token, access_token_payload_schema),
    ).rejects.toThrow();
  });

  it("strips an unexpected field from the parsed payload", async () => {
    const token = jwt.sign({ ...access_payload, type: "Admin" }, SIGNING_KEY);

    const decoded = await verifyAndDecodeJwt(
      token,
      access_token_payload_schema,
    );

    expect(decoded).not.toHaveProperty("type");
  });
});
