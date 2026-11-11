/** @jest-environment jsdom */
const mock_pause = jest.fn();
const mock_play = jest.fn();
const mock_next = jest.fn();
const mock_previous = jest.fn();
const mock_seek = jest.fn();
const mock_now_playing: { value: { duration: number } | null } = {
  value: null,
};
const mock_on_command = jest.fn();

jest.mock("../client/hooks/usePause", () => ({ usePause: () => mock_pause }));
jest.mock("../client/hooks/usePlay", () => ({ usePlay: () => mock_play }));
jest.mock("../client/hooks/useNext", () => ({ useNext: () => mock_next }));
jest.mock("../client/hooks/usePrevious", () => ({
  usePrevious: () => mock_previous,
}));
jest.mock("../client/state/playerStore", () => ({
  now_playing: mock_now_playing,
  seek: (...args: unknown[]) => mock_seek(...args),
}));
jest.mock("../client/lib/native/mediaBridge", () => ({
  onNativeCommand: (...args: unknown[]) => mock_on_command(...args),
}));

import {
  handleNativeCommand,
  startNativeCommands,
} from "../client/lib/native/handleNativeCommands";

beforeEach(() => {
  [mock_pause, mock_play, mock_next, mock_previous, mock_seek].forEach((fn) =>
    fn.mockReset(),
  );
  mock_now_playing.value = { duration: 120 };
});

describe("handleNativeCommand", () => {
  it("pause from the car pauses the phone player once", () => {
    handleNativeCommand({ action: "pause" });

    expect(mock_pause).toHaveBeenCalledTimes(1);
  });

  it("play from the car resumes the phone player", () => {
    handleNativeCommand({ action: "play" });

    expect(mock_play).toHaveBeenCalledWith({});
  });

  it("next and previous call the matching player functions", () => {
    handleNativeCommand({ action: "next" });
    handleNativeCommand({ action: "previous" });

    expect(mock_next).toHaveBeenCalledTimes(1);
    expect(mock_previous).toHaveBeenCalledTimes(1);
  });

  it("seeks 30 seconds into a 120 second track as 25 percent", () => {
    handleNativeCommand({ action: "seek", position_s: 30 });

    expect(mock_seek).toHaveBeenCalledWith(0.25);
  });

  it("clamps a seek past the end of the track to 100 percent", () => {
    handleNativeCommand({ action: "seek", position_s: 500 });

    expect(mock_seek).toHaveBeenCalledWith(1);
  });

  it("ignores a seek with no position", () => {
    handleNativeCommand({ action: "seek" });

    expect(mock_seek).not.toHaveBeenCalled();
  });

  it("ignores an unknown action", () => {
    handleNativeCommand({ action: "explode" } as never);

    expect(mock_pause).not.toHaveBeenCalled();
    expect(mock_play).not.toHaveBeenCalled();
  });

  it("does nothing and does not throw when no track is current", () => {
    mock_now_playing.value = null;

    expect(() => {
      handleNativeCommand({ action: "pause" });
      handleNativeCommand({ action: "seek", position_s: 10 });
    }).not.toThrow();

    expect(mock_pause).not.toHaveBeenCalled();
    expect(mock_seek).not.toHaveBeenCalled();
  });
});

describe("startNativeCommands", () => {
  it("subscribes the command handler to the bridge and returns its unsubscribe", () => {
    const unsubscribe = jest.fn();
    mock_on_command.mockReturnValue(unsubscribe);

    const stop = startNativeCommands();

    expect(mock_on_command).toHaveBeenCalledWith(handleNativeCommand);
    expect(stop).toBe(unsubscribe);
  });
});
