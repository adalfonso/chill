import { effect } from "@preact/signals";

import * as player from "@client/state/playerStore";
import { cachedCover, loadCover } from "./coverArt";
import { getAppState } from "@client/state/AppState";
import { isNativeShell, publishState } from "./mediaBridge";
import type { NativeMediaState } from "@common/nativeMedia";

/** How often to push the position while playing, to bound drift on stalls */
const COARSE_PUSH_MS = 15_000;

/** Audio element events that change what the car should show */
const AUDIO_EVENTS = ["seeked", "playing", "pause", "waiting"] as const;

/**
 * Keep the native media service in step with the phone's player
 *
 * Pushes on track, play-state, queue, and remote-control changes, on the audio
 * element's seek, play, pause, and stall events, and on a coarse timer while
 * playing. Position between pushes is extrapolated natively, so there is no
 * per-second traffic. Does nothing outside the native shell.
 *
 * The player swaps its two audio elements on every track change, so events are
 * listened for on both and only the currently audible one is acted on. Pushes
 * are coalesced into one per microtask: the track signals change before the
 * swap, and reading the position right then would pair the new track with the
 * old element's time.
 *
 * @returns a function that stops the sync
 */
export const startNativeSync = (): (() => void) => {
  if (!isNativeShell()) {
    return () => {};
  }

  let stopped = false;
  let buffering = false;
  let push_scheduled = false;

  const push = (): void => {
    if (push_scheduled) {
      return;
    }

    push_scheduled = true;

    queueMicrotask(() => {
      push_scheduled = false;

      if (!stopped) {
        void publishState(buildState(buffering));
      }
    });
  };

  // The car needs the cover as bytes, so fetch it once and push when it lands
  const loadCurrentCover = (filename: string | null): void => {
    if (!filename || cachedCover(filename) !== null) {
      return;
    }

    void loadCover(filename).then((cover) => {
      if (cover && player.now_playing.value?.album_art_filename === filename) {
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
    } else if (event.type === "playing" || event.type === "pause") {
      buffering = false;
    }

    push();
  };

  const stop_effect = effect(() => {
    // Reading the player here subscribes the effect to each of its signals
    loadCurrentCover(readPlayer().track?.album_art_filename ?? null);
    push();
  });

  const elements = [player.audio, player.crossover];
  const listen = (method: "addEventListener" | "removeEventListener") =>
    elements.forEach((el) =>
      AUDIO_EVENTS.forEach((name) => el[method](name, onAudioEvent)),
    );

  listen("addEventListener");

  const timer = setInterval(() => {
    if (player.is_playing.value && !buffering) {
      push();
    }
  }, COARSE_PUSH_MS);

  return () => {
    stopped = true;
    stop_effect();
    clearInterval(timer);
    listen("removeEventListener");
  };
};

/**
 * Read the parts of the player the car cares about
 *
 * The one place the player signals are read, so the sync effect subscribes to
 * exactly what the snapshot is built from.
 *
 * @returns the current track, play state, queue length, and remote-control flag
 */
const readPlayer = () => ({
  track: player.now_playing.value,
  playing: player.is_playing.value,
  queue_length: player.playlist.value.length,
  // A virtual remote play also sets the local player signals, so only the
  // DeviceConnect outgoing connection can say the phone is a remote
  remote: Boolean(getAppState().outgoing_connection.value),
});

/**
 * Build the snapshot the car needs from the live player
 *
 * Position comes from the audible audio element, because the player store has
 * no position signal. A next and a previous track exist whenever the queue has
 * more than one track, since the store wraps around at both ends. The duration
 * is coerced to a number first, because some server routes (random tracks) send
 * the database decimal as a string. One that is still not finite is sent as 0,
 * which native treats as unknown; NaN would make the native parse throw and
 * freeze the car view.
 *
 * @param buffering - whether playback is currently stalled
 * @returns the snapshot to publish
 */
const buildState = (buffering: boolean): NativeMediaState => {
  const { track, playing, queue_length, remote } = readPlayer();
  const duration = Number(track?.duration);

  return {
    track: track && {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration_s: Number.isFinite(duration) ? duration : 0,
      art_base64: track.album_art_filename
        ? cachedCover(track.album_art_filename)
        : null,
    },
    is_playing: playing,
    buffering,
    position_s: player.audio.currentTime || 0,
    has_next: queue_length > 1,
    has_previous: queue_length > 1,
    remote,
  };
};
