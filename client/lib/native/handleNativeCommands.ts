import * as player from "@client/state/playerStore";
import { onNativeCommand } from "./mediaBridge";
import { useNext } from "@client/hooks/useNext";
import { usePause } from "@client/hooks/usePause";
import { usePlay } from "@client/hooks/usePlay";
import { usePrevious } from "@client/hooks/usePrevious";
import type {
  NativeMediaAction,
  NativeMediaCommand,
} from "@common/nativeMedia";

/**
 * Run one car command against the phone's player
 *
 * Play, pause, next, and previous go through the same hooks the on-screen
 * controls use, so a phone that is a DeviceConnect target still tells its
 * controller about the change. Commands do nothing when no track is current,
 * and unknown actions are ignored so a newer native build cannot break this
 * client.
 *
 * @param command - the command relayed from the car
 */
export const handleNativeCommand = (command: NativeMediaCommand): void => {
  const track = player.now_playing.value;

  if (!track) {
    return;
  }

  const actions: Record<NativeMediaAction, () => void> = {
    play: () => usePlay()({}),
    pause: () => usePause()(),
    next: () => useNext()({}),
    previous: () => usePrevious()(),
    seek: () => {
      // Some routes send the duration as a numeric string, so coerce it; with
      // no usable duration there is no fraction to seek to
      const duration = Number(track.duration);

      if (typeof command.position_s !== "number" || !(duration > 0)) {
        return;
      }

      player.seek(toFraction(command.position_s, duration));
    },
  };

  // Own keys only, so an inherited name like "constructor" is not an action
  if (Object.hasOwn(actions, command.action)) {
    actions[command.action]();
  }
};

/**
 * Start listening for car commands
 *
 * Does nothing outside the native shell, because the bridge never delivers a
 * command there.
 *
 * @returns a function that stops listening
 */
export const startNativeCommands = (): (() => void) =>
  onNativeCommand(handleNativeCommand);

/**
 * Convert a position in seconds to the fraction of the current track
 *
 * The player store seeks by fraction, but the car reports seconds. The track
 * duration comes from metadata, matching how the scrubber computes it.
 *
 * @param seconds - target position in seconds
 * @param duration - track length in seconds, greater than zero
 * @returns the position as a fraction clamped to 0..1
 */
const toFraction = (seconds: number, duration: number): number =>
  Math.min(1, Math.max(0, seconds / duration));
