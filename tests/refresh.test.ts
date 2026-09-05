import {
  maybeRefresh,
  refresh,
} from "../client/lib/auth/refresh";
import {
  getAccessTokenExpiryHint,
  setAccessTokenExpiryHint,
} from "../client/lib/DeviceInfo";

const mockFetch = (impl: typeof fetch) => {
  global.fetch = jest.fn(impl) as unknown as typeof fetch;
};

// jsdom has no fetch/Response globals, and reassigning window.location.href
// triggers jsdom's "not implemented: navigation" stub rather than actually
// updating the property -- replace it with a plain writable stand-in so the
// redirect side effect is observable.
const fakeResponse = (status: number) =>
  ({ status, ok: status >= 200 && status < 300 }) as Response;

const okResponse = () => Promise.resolve(fakeResponse(200));

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
  Object.defineProperty(window, "location", {
    writable: true,
    value: { href: "http://localhost/" },
  });
});

describe("refresh", () => {
  it("covers AE4: concurrent triggers produce exactly one network call", async () => {
    mockFetch(() => okResponse());

    await Promise.all([refresh(), refresh()]);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not cache a rejected promise -- the next call retries", async () => {
    let calls = 0;
    mockFetch(() => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new Error("network down"))
        : okResponse();
    });

    await expect(refresh()).rejects.toThrow("network down");
    await expect(refresh()).resolves.toBeUndefined();
    expect(calls).toBe(2);
  });

  it("leaves client state intact and does not redirect on a transient failure", async () => {
    mockFetch(() => Promise.reject(new Error("network down")));
    const original_href = window.location.href;

    await expect(refresh()).rejects.toThrow();

    expect(window.location.href).toBe(original_href);
  });

  it("covers a definitive 401: retries once, then redirects to login exactly once and rejects", async () => {
    mockFetch(() => Promise.resolve(fakeResponse(401)));

    await Promise.all([
      expect(refresh()).rejects.toThrow(),
      expect(refresh()).rejects.toThrow(),
    ]);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(window.location.href).toContain("/auth/login");
  });

  it("recovers from a benign concurrent-rotation race: a 401 followed by a 200 on retry resolves without redirecting", async () => {
    let calls = 0;
    mockFetch(() => {
      calls += 1;
      return Promise.resolve(fakeResponse(calls === 1 ? 401 : 200));
    });
    const original_href = window.location.href;

    await expect(refresh()).resolves.toBeUndefined();

    expect(calls).toBe(2);
    expect(window.location.href).toBe(original_href);
  });

  it("caches an expiry hint on success", async () => {
    mockFetch(() => okResponse());
    const before = Date.now();

    await refresh();

    expect(getAccessTokenExpiryHint()).toBeGreaterThan(before);
  });
});

describe("maybeRefresh", () => {
  it("issues no refresh when plenty of TTL remains", async () => {
    mockFetch(() => okResponse());
    setAccessTokenExpiryHint(Date.now() + 6 * 60 * 60 * 1000);

    await maybeRefresh();

    expect(fetch).not.toHaveBeenCalled();
  });

  it("refreshes when the cached hint says the token is running low", async () => {
    mockFetch(() => okResponse());
    setAccessTokenExpiryHint(Date.now() + 60 * 1000);

    await maybeRefresh();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("covers a cleared localStorage: refreshes on a missing hint rather than treating it as logged out", async () => {
    mockFetch(() => okResponse());

    expect(getAccessTokenExpiryHint()).toBeNull();

    await maybeRefresh();

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
