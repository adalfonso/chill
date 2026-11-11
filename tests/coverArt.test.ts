/** @jest-environment jsdom */
import { cachedCover, loadCover } from "../client/lib/native/coverArt";

const ok_response = () => ({
  ok: true,
  blob: async () => new Blob(["art-bytes"]),
});

// The cache lives for the module, so give each test covers no earlier test used
let counter = 0;
const fresh_cover = () => `cover-${(counter += 1)}.jpg`;

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(ok_response()) as never;
});

describe("loadCover", () => {
  it("requests the 256px cover and returns it as bare base64", async () => {
    const cover = fresh_cover();

    const loaded = await loadCover(cover);

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/v1/media/cover/${cover}?size=256`,
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(loaded).toBe(btoa("art-bytes"));
  });

  it("serves a loaded cover from the cache without another request", async () => {
    const cover = fresh_cover();

    await loadCover(cover);
    await loadCover(cover);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(cachedCover(cover)).toBe(btoa("art-bytes"));
  });

  it("shares one request between concurrent loads of the same cover", async () => {
    const cover = fresh_cover();

    await Promise.all([loadCover(cover), loadCover(cover)]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns null for a failed response and does not cache it", async () => {
    const cover = fresh_cover();
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as never;

    expect(await loadCover(cover)).toBeNull();
    expect(cachedCover(cover)).toBeNull();
  });

  it("returns null when the network is down, then retries on the next call", async () => {
    const cover = fresh_cover();
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(ok_response()) as never;

    expect(await loadCover(cover)).toBeNull();
    expect(await loadCover(cover)).toBe(btoa("art-bytes"));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("gives up on a stalled request after the timeout and retries on the next call", async () => {
    jest.useFakeTimers("legacy");
    const cover = fresh_cover();
    // A request that never answers, but honors being aborted
    global.fetch = jest
      .fn()
      .mockImplementationOnce(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) =>
            init.signal.addEventListener("abort", () =>
              reject(new Error("aborted")),
            ),
          ),
      )
      .mockResolvedValue(ok_response()) as never;

    const stalled = loadCover(cover);
    jest.advanceTimersByTime(10_000);

    expect(await stalled).toBeNull();

    jest.useRealTimers();
    expect(await loadCover(cover)).toBe(btoa("art-bytes"));
  });

  it("forgets the oldest cover past the cache limit", async () => {
    const first = fresh_cover();
    await loadCover(first);

    for (let i = 0; i < 20; i += 1) {
      await loadCover(fresh_cover());
    }

    expect(cachedCover(first)).toBeNull();
  });
});

describe("cachedCover", () => {
  it("is null for a cover that was never loaded", () => {
    expect(cachedCover(fresh_cover())).toBeNull();
  });
});
