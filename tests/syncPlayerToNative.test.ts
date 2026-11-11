/** @jest-environment jsdom */
import { signal } from "@preact/signals";

const mock_publish = jest.fn();
const mock_is_native = jest.fn();

/** A stand-in audio element: an event target with a settable clock */
class FakeAudio extends EventTarget {
  currentTime = 0;
}

const mock_player = {
  audio: new FakeAudio(),
  crossover: new FakeAudio(),
  now_playing: signal<unknown>(null),
  is_playing: signal(false),
  playlist: signal<Array<unknown>>([]),
};
const mock_outgoing = signal<string | null>(null);

jest.mock("../client/lib/native/mediaBridge", () => ({
  isNativeShell: () => mock_is_native(),
  publishState: (...args: unknown[]) => mock_publish(...args),
}));
jest.mock("../client/state/AppState", () => ({
  getAppState: () => ({ outgoing_connection: mock_outgoing }),
}));
jest.mock("../client/state/playerStore", () => mock_player);

import { startNativeSync } from "../client/lib/native/syncPlayerToNative";

const track = (overrides = {}) => ({
  id: 7,
  title: "Song",
  artist: "Artist",
  album: "Album",
  duration: 200,
  album_art_filename: "cover-a.jpg",
  ...overrides,
});

const last_state = () => mock_publish.mock.calls.at(-1)?.[0];
const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

/** Let the microtask that carries a coalesced push run */
const tick = () => Promise.resolve();

let stop: () => void = () => {};
let cover_counter = 0;

/** A cover filename no earlier test used, since the cache lives for the module */
const fresh_cover = () => `cover-${(cover_counter += 1)}.jpg`;

beforeEach(() => {
  mock_publish.mockReset();
  mock_is_native.mockReset().mockReturnValue(true);
  mock_player.audio = new FakeAudio();
  mock_player.crossover = new FakeAudio();
  mock_player.now_playing.value = null;
  mock_player.is_playing.value = false;
  mock_player.playlist.value = [];
  mock_outgoing.value = null;
  global.fetch = jest.fn().mockResolvedValue({ ok: false }) as never;
});

afterEach(() => {
  stop();
  stop = () => {};
  jest.useRealTimers();
});

describe("startNativeSync", () => {
  it("does nothing outside the native shell", async () => {
    mock_is_native.mockReturnValue(false);

    stop = startNativeSync();
    mock_player.now_playing.value = track();
    await tick();

    expect(mock_publish).not.toHaveBeenCalled();
  });

  it("publishes an empty state at start", async () => {
    stop = startNativeSync();
    await tick();

    expect(mock_publish).toHaveBeenCalledTimes(1);
    expect(last_state().track).toBeNull();
  });

  it("publishes new metadata once on a track change", async () => {
    stop = startNativeSync();
    await tick();
    mock_publish.mockClear();

    mock_player.now_playing.value = track({ album_art_filename: null });
    await tick();

    expect(mock_publish).toHaveBeenCalledTimes(1);
    expect(last_state().track).toMatchObject({
      id: 7,
      title: "Song",
      artist: "Artist",
      album: "Album",
      duration_s: 200,
      art_base64: null,
    });
  });

  it("publishes play and pause as two play-state changes", async () => {
    mock_player.now_playing.value = track({ album_art_filename: null });
    stop = startNativeSync();
    await tick();
    mock_publish.mockClear();

    mock_player.is_playing.value = true;
    await tick();
    mock_player.is_playing.value = false;
    await tick();

    expect(mock_publish.mock.calls.map(([s]) => s.is_playing)).toEqual([
      true,
      false,
    ]);
  });

  it("collapses several changes in one run into a single push", async () => {
    mock_player.now_playing.value = track({ album_art_filename: null });
    stop = startNativeSync();
    await tick();
    mock_publish.mockClear();

    mock_player.is_playing.value = true;
    mock_player.playlist.value = [track(), track({ id: 8 })];
    mock_outgoing.value = "device-1";
    await tick();

    expect(mock_publish).toHaveBeenCalledTimes(1);
  });

  it("reads the position after the audio swap, not before it", async () => {
    // The store changes its signals first and swaps the two elements after.
    // The first push must carry the new audible element's time.
    const old_audible = mock_player.audio;
    const new_audible = mock_player.crossover;
    old_audible.currentTime = 199;
    new_audible.currentTime = 0.5;
    mock_player.now_playing.value = track({
      id: 1,
      album_art_filename: null,
    });
    stop = startNativeSync();
    await tick();
    mock_publish.mockClear();

    mock_player.now_playing.value = track({
      id: 2,
      album_art_filename: null,
    });
    mock_player.crossover = old_audible;
    mock_player.audio = new_audible;
    await tick();

    expect(mock_publish).toHaveBeenCalledTimes(1);
    expect(last_state().track.id).toBe(2);
    expect(last_state().position_s).toBe(0.5);
  });

  it("a seeked event on the audible element publishes the new position", async () => {
    mock_player.now_playing.value = track({ album_art_filename: null });
    stop = startNativeSync();
    await tick();
    mock_publish.mockClear();

    mock_player.audio.currentTime = 42;
    mock_player.audio.dispatchEvent(new Event("seeked"));
    await tick();

    expect(mock_publish).toHaveBeenCalledTimes(1);
    expect(last_state().position_s).toBe(42);
  });

  it("ignores events from the preloaded, silent element", async () => {
    mock_player.now_playing.value = track({ album_art_filename: null });
    stop = startNativeSync();
    await tick();
    mock_publish.mockClear();

    mock_player.crossover.dispatchEvent(new Event("seeked"));
    await tick();

    expect(mock_publish).not.toHaveBeenCalled();
  });

  it("follows the element swap: the new audible element is the one heard", async () => {
    mock_player.now_playing.value = track({ album_art_filename: null });
    stop = startNativeSync();
    await tick();
    mock_publish.mockClear();
    const next_audible = mock_player.crossover;
    mock_player.crossover = mock_player.audio;
    mock_player.audio = next_audible;

    next_audible.currentTime = 5;
    next_audible.dispatchEvent(new Event("seeked"));
    await tick();

    expect(last_state().position_s).toBe(5);
  });

  it("publishes buffering on waiting and clears it on playing", async () => {
    mock_player.now_playing.value = track({ album_art_filename: null });
    stop = startNativeSync();
    await tick();

    mock_player.audio.dispatchEvent(new Event("waiting"));
    await tick();
    expect(last_state().buffering).toBe(true);

    mock_player.audio.dispatchEvent(new Event("playing"));
    await tick();
    expect(last_state().buffering).toBe(false);
  });

  it("reports remote control from the outgoing connection, not the local signals", async () => {
    mock_player.now_playing.value = track({ album_art_filename: null });
    stop = startNativeSync();
    await tick();

    mock_outgoing.value = "device-1";
    await tick();

    expect(last_state().remote).toBe(true);
  });

  it("reports no next or previous for a single-track queue", async () => {
    mock_player.playlist.value = [track()];
    mock_player.now_playing.value = track({ album_art_filename: null });
    stop = startNativeSync();
    await tick();

    expect(last_state()).toMatchObject({
      has_next: false,
      has_previous: false,
    });
  });

  it("reports next and previous for a longer queue", async () => {
    mock_player.playlist.value = [track(), track({ id: 8 }), track({ id: 9 })];
    mock_player.now_playing.value = track({ album_art_filename: null });
    stop = startNativeSync();
    await tick();

    expect(last_state()).toMatchObject({ has_next: true, has_previous: true });
  });

  it("accepts a duration that arrives as a numeric string (random tracks)", async () => {
    // The random-tracks route returns the database decimal as a string
    mock_player.now_playing.value = track({
      duration: "245.5",
      album_art_filename: null,
    });
    stop = startNativeSync();
    await tick();

    expect(last_state().track.duration_s).toBe(245.5);
  });

  it("sends a NaN duration as 0 so native can parse it", async () => {
    mock_player.now_playing.value = track({
      duration: Number.NaN,
      album_art_filename: null,
    });
    stop = startNativeSync();
    await tick();

    expect(last_state().track.duration_s).toBe(0);
  });

  it("stops publishing after it is stopped, even for a push already queued", async () => {
    stop = startNativeSync();
    await tick();
    mock_publish.mockClear();

    mock_player.is_playing.value = true;
    stop();
    mock_player.now_playing.value = track({ album_art_filename: null });
    mock_player.audio.dispatchEvent(new Event("seeked"));
    await tick();

    expect(mock_publish).not.toHaveBeenCalled();
  });
});

describe("coarse position timer", () => {
  it("does not publish between timer pushes, then publishes once per interval while playing", async () => {
    jest.useFakeTimers("legacy");
    mock_player.now_playing.value = track({ album_art_filename: null });
    mock_player.is_playing.value = true;
    stop = startNativeSync();
    await tick();
    mock_publish.mockClear();

    jest.advanceTimersByTime(14_000);
    await tick();
    expect(mock_publish).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1_000);
    await tick();
    expect(mock_publish).toHaveBeenCalledTimes(1);
  });

  it("does not push on the timer while paused", async () => {
    jest.useFakeTimers("legacy");
    mock_player.now_playing.value = track({ album_art_filename: null });
    stop = startNativeSync();
    await tick();
    mock_publish.mockClear();

    jest.advanceTimersByTime(60_000);
    await tick();

    expect(mock_publish).not.toHaveBeenCalled();
  });
});

describe("album art", () => {
  const ok_response = () => ({
    ok: true,
    blob: async () => new Blob(["art-bytes"]),
  });

  it("republishes with art once the cover loads", async () => {
    const cover = fresh_cover();
    global.fetch = jest.fn().mockResolvedValue(ok_response()) as never;
    stop = startNativeSync();

    mock_player.now_playing.value = track({ album_art_filename: cover });
    await flush();

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/v1/media/cover/${cover}?size=256`,
    );
    expect(typeof last_state().track.art_base64).toBe("string");
    expect(last_state().track.art_base64.length).toBeGreaterThan(0);
  });

  it("fetches a repeated cover only once", async () => {
    const cover = fresh_cover();
    global.fetch = jest.fn().mockResolvedValue(ok_response()) as never;
    stop = startNativeSync();

    mock_player.now_playing.value = track({ album_art_filename: cover });
    await flush();
    mock_player.now_playing.value = track({ id: 8, album_art_filename: cover });
    await flush();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not start a second fetch for a cover that is still loading", async () => {
    const cover = fresh_cover();
    let release: (value: unknown) => void = () => {};
    global.fetch = jest.fn(
      () => new Promise((resolve) => (release = resolve)),
    ) as never;
    stop = startNativeSync();

    mock_player.now_playing.value = track({ album_art_filename: cover });
    mock_player.is_playing.value = true;
    mock_player.is_playing.value = false;
    await tick();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    release({ ok: false });
  });

  it("publishes state with no art and does not throw when the cover fetch fails", async () => {
    const cover = fresh_cover();
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as never;
    stop = startNativeSync();

    mock_player.now_playing.value = track({ album_art_filename: cover });
    await flush();

    expect(last_state().track.art_base64).toBeNull();
  });

  it("retries a failed cover on the next change instead of giving up for the session", async () => {
    const cover = fresh_cover();
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(ok_response()) as never;
    stop = startNativeSync();

    mock_player.now_playing.value = track({ album_art_filename: cover });
    await flush();
    expect(last_state().track.art_base64).toBeNull();

    mock_player.is_playing.value = true;
    await flush();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(typeof last_state().track.art_base64).toBe("string");
  });

  it("forgets the oldest cover past the cache limit and fetches it again", async () => {
    global.fetch = jest.fn().mockResolvedValue(ok_response()) as never;
    stop = startNativeSync();
    const first = fresh_cover();

    mock_player.now_playing.value = track({ album_art_filename: first });
    await flush();

    for (let i = 0; i < 20; i += 1) {
      mock_player.now_playing.value = track({
        id: 100 + i,
        album_art_filename: fresh_cover(),
      });
      await flush();
    }

    const calls_before = (global.fetch as jest.Mock).mock.calls.length;
    mock_player.now_playing.value = track({ id: 7, album_art_filename: first });
    await flush();

    expect((global.fetch as jest.Mock).mock.calls.length).toBe(
      calls_before + 1,
    );
  });

  it("does not republish a cover for a track that is no longer current", async () => {
    const cover = fresh_cover();
    let release: (value: unknown) => void = () => {};
    global.fetch = jest.fn(
      () => new Promise((resolve) => (release = resolve)),
    ) as never;
    stop = startNativeSync();

    mock_player.now_playing.value = track({ album_art_filename: cover });
    await tick();
    mock_player.now_playing.value = track({
      id: 9,
      album_art_filename: null,
    });
    await tick();
    mock_publish.mockClear();

    release(ok_response());
    await flush();

    expect(mock_publish).not.toHaveBeenCalled();
  });

  it("skips the fetch when the track has no cover", async () => {
    stop = startNativeSync();

    mock_player.now_playing.value = track({ album_art_filename: null });
    await flush();

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
