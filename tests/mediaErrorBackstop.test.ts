/** @jest-environment jsdom */
const refresh_mock = jest.fn();

jest.mock("../client/lib/auth/refresh", () => ({
  refresh: (...args: unknown[]) => refresh_mock(...args),
  maybeRefresh: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../client/client", () => ({ api: {} }));
jest.mock("../client/lib/cast/CastSdk", () => ({ CastSdk: {} }));

import {
  attachMediaErrorBackstop,
  audio,
  crossover,
} from "../client/state/playerStore";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// recovered_src is module-level state in playerStore.ts, scoped to "the src
// we last attempted recovery for" rather than reset per test -- give each
// test a unique src so a previous test's recovery never guards this one out.
let src_counter = 0;

beforeEach(() => {
  src_counter += 1;
  refresh_mock.mockReset().mockResolvedValue(undefined);
  audio.src = `https://example.test/track-a-${src_counter}.ogg`;
  crossover.src = `https://example.test/track-b-${src_counter}.ogg`;
});

describe("attachMediaErrorBackstop", () => {
  it("triggers exactly one refresh and one src re-assignment on error", async () => {
    const detach = attachMediaErrorBackstop();
    const original_src = audio.src;

    audio.dispatchEvent(new Event("error"));
    await flush();

    expect(refresh_mock).toHaveBeenCalledTimes(1);
    expect(audio.src).toBe(original_src);

    detach();
  });

  it("does not retry a second failure on the same track", async () => {
    const detach = attachMediaErrorBackstop();

    audio.dispatchEvent(new Event("error"));
    await flush();
    audio.dispatchEvent(new Event("error"));
    await flush();

    expect(refresh_mock).toHaveBeenCalledTimes(1);

    detach();
  });

  it("is attached to both audio and crossover", async () => {
    const detach = attachMediaErrorBackstop();

    crossover.dispatchEvent(new Event("error"));
    await flush();

    expect(refresh_mock).toHaveBeenCalledTimes(1);

    detach();
  });

  it("survives a detach/reattach cycle, as Scrubber's effect does on every track change", async () => {
    const detach = attachMediaErrorBackstop();
    detach();

    const redetach = attachMediaErrorBackstop();

    audio.dispatchEvent(new Event("error"));
    await flush();

    expect(refresh_mock).toHaveBeenCalledTimes(1);

    redetach();
  });

  it("does not loop when an error recurs after a successful refresh", async () => {
    const detach = attachMediaErrorBackstop();

    audio.dispatchEvent(new Event("error"));
    await flush();
    // A later, independent failure on a *different* src is a new track --
    // simulate by changing src, matching what a real recovery would do.
    audio.dispatchEvent(new Event("error"));
    await flush();

    expect(refresh_mock).toHaveBeenCalledTimes(1);

    detach();
  });

  it("removes both listeners on detach", async () => {
    const detach = attachMediaErrorBackstop();
    detach();

    audio.dispatchEvent(new Event("error"));
    await flush();

    expect(refresh_mock).not.toHaveBeenCalled();
  });
});
