import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

import type { NativeMediaCommand, NativeMediaState } from "@common/nativeMedia";

/** The native side of the bridge, implemented by the Android media plugin */
type MediaBridgePlugin = {
  publishState: (state: NativeMediaState) => Promise<void>;
  clearState: () => Promise<void>;
  addListener: (
    event: "command",
    handler: (command: NativeMediaCommand) => void,
  ) => Promise<PluginListenerHandle>;
};

const plugin = registerPlugin<MediaBridgePlugin>("MediaBridge");

/**
 * Whether the app is running inside the native (Capacitor) shell
 *
 * Every native media path is gated on this, so the web build, the PWA, and
 * other browsers never touch the plugin.
 *
 * @returns true inside the Android shell, false everywhere else
 */
export const isNativeShell = (): boolean => Capacitor.isNativePlatform();

/**
 * Push a snapshot of the player to the native media service
 *
 * Does nothing outside the native shell. A failed push is swallowed: the car
 * view is a mirror, and the next push repairs any gap.
 *
 * @param state - the player snapshot to publish
 * @returns resolves once the push settles; never rejects
 */
export const publishState = async (state: NativeMediaState): Promise<void> => {
  if (!isNativeShell()) {
    return;
  }

  await plugin.publishState(state).catch(() => {});
};

/**
 * Tell the native media service to forget the current playback
 *
 * Used on sign-out so the car stops showing the last track. Does nothing
 * outside the native shell, and never rejects.
 *
 * @returns resolves once the clear settles
 */
export const clearState = async (): Promise<void> => {
  if (!isNativeShell()) {
    return;
  }

  await plugin.clearState().catch(() => {});
};

/**
 * Subscribe to commands sent from the car
 *
 * Outside the native shell no commands ever arrive, so the subscription is a
 * no-op that still returns a safe unsubscribe function.
 *
 * @param handler - called once per car command
 * @returns a function that removes the subscription
 */
export const onNativeCommand = (
  handler: (command: NativeMediaCommand) => void,
): (() => void) => {
  if (!isNativeShell()) {
    return () => {};
  }

  const handle = plugin.addListener("command", handler);

  return () => {
    handle.then((listener) => listener.remove()).catch(() => {});
  };
};
