import { effect } from "@preact/signals";

import * as player from "@client/state/playerStore";
import { getAppState } from "@client/state/AppState";
import { isNativeShell, publishState } from "./mediaBridge";
import type { NativeMediaState } from "@common/nativeMedia";

/** How often to push the position while playing, to bound drift on stalls */
const COARSE_PUSH_MS = 15_000;

/** Cover size sent to the car; small enough to cross the bridge cheaply */
const ART_SIZE = 256;

/** How many covers to keep, so a long session cannot grow without bound */
const ART_CACHE_LIMIT = 20;

/** Audio element events that change what the car should show */
const AUDIO_EVENTS = ["seeked", "playing", "pause", "waiting"] as const;

/** Covers already fetched, keyed by filename; null means the fetch failed */
const art_cache = new Map<string, string | null>();

/**
 * Convert a blob to a bare base64 string
 *
 * @param blob - the image data
 * @returns the base64 payload without the data-URL prefix
 */
const toBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Fetch a small cover for the car
 *
 * Android Auto loads artwork without the login cookie, and the cover route
 * requires it. The WebView already holds the cookie, so it fetches the image
 * and hands the bytes to native.
 *
 * @param filename - the album art filename from the track metadata
 * @returns the cover as base64, or null when it could not be fetched
 */
const fetchArt = async (filename: string): Promise<string | null> => {
  try {
    const response = await fetch(
      `/api/v1/media/cover/${filename}?size=${ART_SIZE}`,
    );

    return response.ok ? await toBase64(await response.blob()) : null;
  } catch {
    return null;
  }
};

/**
 * Remember a cover, evicting the oldest one past the cache limit
 *
 * @param filename - the cover's filename
 * @param art - its base64 data, or null for a failed fetch
 */
const cacheArt = (filename: string, art: string | null): void => {
  art_cache.delete(filename);
  art_cache.set(filename, art);

  if (art_cache.size > ART_CACHE_LIMIT) {
    const oldest = art_cache.keys().next().value;

    if (oldest !== undefined) {
      art_cache.delete(oldest);
    }
  }
};

/**
 * Build the snapshot the car needs from the live player
 *
 * Position comes from the audible audio element, because the player store has
 * no position signal. A next and a previous track exist whenever the queue has
 * more than one track, since the store wraps around at both ends. The remote
 * flag comes from the DeviceConnect outgoing connection: a virtual remote
 * play also sets the local player signals, so those cannot say it.
 *
 * @param buffering - whether playback is currently stalled
 * @returns the snapshot to publish
 */
const buildState = (buffering: boolean): NativeMediaState => {
  const track = player.now_playing.value;
  const queue_length = player.playlist.value.length;

  return {
    track: track
      ? {
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration_s: track.duration,
          art_base64: track.album_art_filename
            ? (art_cache.get(track.album_art_filename) ?? null)
            : null,
        }
      : null,
    is_playing: player.is_playing.value,
    buffering,
    position_s: player.audio.currentTime || 0,
    has_next: queue_length > 1,
    has_previous: queue_length > 1,
    remote: Boolean(getAppState().outgoing_connection.value),
  };
};

/**
 * Keep the native media service in step with the phone's player
 *
 * Pushes on track, play-state, queue, and remote-control changes, on the audio
 * element's seek, play, pause, and stall events, and on a coarse timer while
 * playing. Position between pushes is extrapolated natively, so there is no
 * per-second traffic. Does nothing outside the native shell.
 *
 * The player swaps its two audio elements on every track change, so events are
 * listened for on both and only the currently audible one is acted on.
 *
 * @returns a function that stops the sync
 */
export const startNativeSync = (): (() => void) => {
  if (!isNativeShell()) {
    return () => {};
  }

  let buffering = false;

  const push = (): void => {
    void publishState(buildState(buffering));
  };

  // Fetch the current cover once, then republish so the car gets the art
  const ensureArt = (filename: string | null): void => {
    if (!filename || art_cache.has(filename)) {
      return;
    }

    cacheArt(filename, null);
    void fetchArt(filename).then((art) => {
      cacheArt(filename, art);

      if (player.now_playing.value?.album_art_filename === filename) {
        push();
      }
    });
  };

  const onAudioEvent = (event: Event): void => {
    // The preloaded element is silent; only the audible one matters
    if (event.target !== player.audio) {
      return;
    }

    if (event.type === "waiting") {
      buffering = true;
    }

    if (event.type === "playing" || event.type === "pause") {
      buffering = false;
    }

    push();
  };

  const dispose_effect = effect(() => {
    // Reading these signals subscribes the effect to each of them
    ensureArt(player.now_playing.value?.album_art_filename ?? null);
    void player.is_playing.value;
    void player.playlist.value;
    void getAppState().outgoing_connection.value;
    push();
  });

  const elements = [player.audio, player.crossover];

  elements.forEach((el) =>
    AUDIO_EVENTS.forEach((name) => el.addEventListener(name, onAudioEvent)),
  );

  const timer = setInterval(() => {
    if (player.is_playing.value && !buffering) {
      push();
    }
  }, COARSE_PUSH_MS);

  return () => {
    dispose_effect();
    clearInterval(timer);
    elements.forEach((el) =>
      AUDIO_EVENTS.forEach((name) =>
        el.removeEventListener(name, onAudioEvent),
      ),
    );
  };
};
