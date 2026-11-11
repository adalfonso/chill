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

let stop: () => void = () => {};

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
  it("does nothing outside the native shell", () => {
    mock_is_native.mockReturnValue(false);

    stop = startNativeSync();
    mock_player.now_playing.value = track();

    expect(mock_publish).not.toHaveBeenCalled();
  });

  it("publishes an empty state at start", () => {
    stop = startNativeSync();

    expect(mock_publish).toHaveBeenCalledTimes(1);
    expect(last_state().track).toBeNull();
  });

  it("publishes new metadata once on a track change", () => {
    stop = startNativeSync();
    mock_publish.mockClear();

    mock_player.now_playing.value = track();

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

  it("publishes play and pause as two play-state changes", () => {
    mock_player.now_playing.value = track();
    stop = startNativeSync();
    mock_publish.mockClear();

    mock_player.is_playing.value = true;
    mock_player.is_playing.value = false;

    expect(mock_publish.mock.calls.map(([s]) => s.is_playing)).toEqual([
      true,
      false,
    ]);
  });

  it("a seeked event on the audible element publishes the new position", () => {
    mock_player.now_playing.value = track();
    stop = startNativeSync();
    mock_publish.mockClear();

    mock_player.audio.currentTime = 42;
    mock_player.audio.dispatchEvent(new Event("seeked"));

    expect(mock_publish).toHaveBeenCalledTimes(1);
    expect(last_state().position_s).toBe(42);
  });

  it("ignores events from the preloaded, silent element", () => {
    mock_player.now_playing.value = track();
    stop = startNativeSync();
    mock_publish.mockClear();

    mock_player.crossover.dispatchEvent(new Event("seeked"));

    expect(mock_publish).not.toHaveBeenCalled();
  });

  it("follows the element swap: the new audible element is the one heard", () => {
    mock_player.now_playing.value = track();
    stop = startNativeSync();
    mock_publish.mockClear();
    const next_audible = mock_player.crossover;
    mock_player.crossover = mock_player.audio;
    mock_player.audio = next_audible;

    next_audible.currentTime = 5;
    next_audible.dispatchEvent(new Event("seeked"));

    expect(last_state().position_s).toBe(5);
  });

  it("publishes buffering on waiting and clears it on playing", () => {
    mock_player.now_playing.value = track();
    stop = startNativeSync();

    mock_player.audio.dispatchEvent(new Event("waiting"));
    expect(last_state().buffering).toBe(true);

    mock_player.audio.dispatchEvent(new Event("playing"));
    expect(last_state().buffering).toBe(false);
  });

  it("reports remote control from the outgoing connection, not the local signals", () => {
    mock_player.now_playing.value = track();
    stop = startNativeSync();

    mock_outgoing.value = "device-1";

    expect(last_state().remote).toBe(true);
  });

  it("reports no next or previous for a single-track queue", () => {
    mock_player.playlist.value = [track()];
    mock_player.now_playing.value = track();
    stop = startNativeSync();

    expect(last_state()).toMatchObject({
      has_next: false,
      has_previous: false,
    });
  });

  it("reports next and previous for a longer queue", () => {
    mock_player.playlist.value = [track(), track({ id: 8 }), track({ id: 9 })];
    mock_player.now_playing.value = track();
    stop = startNativeSync();

    expect(last_state()).toMatchObject({ has_next: true, has_previous: true });
  });

  it("stops publishing after it is stopped", () => {
    stop = startNativeSync();
    mock_publish.mockClear();

    stop();
    mock_player.now_playing.value = track();
    mock_player.audio.dispatchEvent(new Event("seeked"));

    expect(mock_publish).not.toHaveBeenCalled();
  });
});

describe("coarse position timer", () => {
  it("does not publish between timer pushes, then publishes once per interval while playing", () => {
    jest.useFakeTimers();
    mock_player.now_playing.value = track();
    mock_player.is_playing.value = true;
    stop = startNativeSync();
    mock_publish.mockClear();

    jest.advanceTimersByTime(14_000);
    expect(mock_publish).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1_000);
    expect(mock_publish).toHaveBeenCalledTimes(1);
  });

  it("does not push on the timer while paused", () => {
    jest.useFakeTimers();
    mock_player.now_playing.value = track();
    stop = startNativeSync();
    mock_publish.mockClear();

    jest.advanceTimersByTime(60_000);

    expect(mock_publish).not.toHaveBeenCalled();
  });
});

describe("album art", () => {
  const ok_response = () => ({
    ok: true,
    blob: async () => new Blob(["art-bytes"]),
  });

  it("republishes with art once the cover loads", async () => {
    global.fetch = jest.fn().mockResolvedValue(ok_response()) as never;
    stop = startNativeSync();

    mock_player.now_playing.value = track({ album_art_filename: "c1.jpg" });
    await flush();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/media/cover/c1.jpg?size=256",
    );
    expect(typeof last_state().track.art_base64).toBe("string");
    expect(last_state().track.art_base64.length).toBeGreaterThan(0);
  });

  it("fetches a repeated cover only once", async () => {
    global.fetch = jest.fn().mockResolvedValue(ok_response()) as never;
    stop = startNativeSync();

    mock_player.now_playing.value = track({ album_art_filename: "c2.jpg" });
    await flush();
    mock_player.now_playing.value = track({
      id: 8,
      album_art_filename: "c2.jpg",
    });
    await flush();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("publishes state with no art and does not throw when the cover fetch fails", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as never;
    stop = startNativeSync();

    mock_player.now_playing.value = track({ album_art_filename: "c3.jpg" });
    await flush();

    expect(last_state().track.art_base64).toBeNull();
  });

  it("skips the fetch when the track has no cover", async () => {
    stop = startNativeSync();

    mock_player.now_playing.value = track({ album_art_filename: null });
    await flush();

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
