/** @jest-environment node */
import { redactQueryString } from "../server/middleware/accessLogs";

describe("redactQueryString", () => {
  it("strips a query string while preserving the path", () => {
    expect(redactQueryString("/cast/media/123.mp3?token=eyJhbGciOi")).toBe(
      "/cast/media/123.mp3",
    );
  });

  it("leaves a path with no query string unchanged", () => {
    expect(redactQueryString("/api/v1/user/get")).toBe("/api/v1/user/get");
  });

  it("strips an empty query string", () => {
    expect(redactQueryString("/auth/refresh?")).toBe("/auth/refresh");
  });
});
