/** @jest-environment jsdom */
const mock_plugin = {
  publishState: jest.fn(),
  addListener: jest.fn(),
};
const mock_is_native = jest.fn();

jest.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mock_is_native() },
  registerPlugin: () => mock_plugin,
}));

import {
  onNativeCommand,
  publishState,
} from "../client/lib/native/mediaBridge";
import type { NativeMediaState } from "../common/nativeMedia";

const state: NativeMediaState = {
  track: null,
  is_playing: false,
  buffering: false,
  position_s: 0,
  has_next: false,
  has_previous: false,
  remote: false,
};

beforeEach(() => {
  mock_plugin.publishState.mockReset().mockResolvedValue(undefined);
  mock_plugin.addListener.mockReset();
  mock_is_native.mockReset();
});

describe("mediaBridge on the native platform", () => {
  beforeEach(() => mock_is_native.mockReturnValue(true));

  it("publishes the state to the plugin once", async () => {
    await publishState(state);

    expect(mock_plugin.publishState).toHaveBeenCalledTimes(1);
    expect(mock_plugin.publishState).toHaveBeenCalledWith(state);
  });

  it("does not throw when the plugin rejects a publish", async () => {
    mock_plugin.publishState.mockRejectedValue(new Error("bridge down"));

    await expect(publishState(state)).resolves.toBeUndefined();
  });

  it("delivers a command event to the subscribed handler", () => {
    mock_plugin.addListener.mockResolvedValue({ remove: jest.fn() });
    const handler = jest.fn();

    onNativeCommand(handler);

    expect(mock_plugin.addListener).toHaveBeenCalledWith("command", handler);
  });

  it("removes the listener when unsubscribed", async () => {
    const remove = jest.fn();
    mock_plugin.addListener.mockResolvedValue({ remove });

    const unsubscribe = onNativeCommand(jest.fn());
    unsubscribe();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe("mediaBridge on the web", () => {
  beforeEach(() => mock_is_native.mockReturnValue(false));

  it("publishing does nothing and does not throw", async () => {
    await expect(publishState(state)).resolves.toBeUndefined();

    expect(mock_plugin.publishState).not.toHaveBeenCalled();
  });

  it("subscribing never touches the plugin and returns a safe unsubscribe", () => {
    const unsubscribe = onNativeCommand(jest.fn());

    expect(mock_plugin.addListener).not.toHaveBeenCalled();
    expect(() => unsubscribe()).not.toThrow();
  });
});
