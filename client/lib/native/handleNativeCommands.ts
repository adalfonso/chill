import * as player from "@client/state/playerStore";
import { onNativeCommand } from "./mediaBridge";
import { useNext } from "@client/hooks/useNext";
import { usePause } from "@client/hooks/usePause";
import { usePlay } from "@client/hooks/usePlay";
import { usePrevious } from "@client/hooks/usePrevious";
import type { NativeMediaCommand } from "@common/nativeMedia";

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

  switch (command.action) {
    case "play":
      usePlay()({});
      break;
    case "pause":
      usePause()();
      break;
    case "next":
      useNext()({});
      break;
    case "previous":
      usePrevious()();
      break;
    case "seek":
      seekTo(command.position_s, Number(track.duration));
      break;
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
 * Seek the current track to a position the car gave in seconds
 *
 * The player store seeks by fraction. Some routes send the duration as a numeric
 * string, so the caller coerces it; with no usable duration there is nothing to
 * seek within.
 *
 * @param seconds - the target position, or undefined when the car sent none
 * @param duration - the track length in seconds
 */
const seekTo = (seconds: number | undefined, duration: number): void => {
  if (seconds === undefined || !(duration > 0)) {
    return;
  }

  player.seek(Math.min(1, Math.max(0, seconds / duration)));
};
