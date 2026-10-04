import {
  getElapsedTimeTracking,
  getTimeTracking,
} from "../client/lib/AudioProgress";

describe("getElapsedTimeTracking", () => {
  it("reads 0:00 at the very start of a track, not 0:01", () => {
    expect(getElapsedTimeTracking(0)).toBe("0:00");
  });

  it("never goes backwards as a track starts, and ticks over on whole seconds", () => {
    const shown = [0, 0.1, 0.5, 0.9, 1, 1.4, 1.99, 2].map(
      getElapsedTimeTracking,
    );

    expect(shown).toEqual([
      "0:00",
      "0:00",
      "0:00",
      "0:00",
      "0:01",
      "0:01",
      "0:01",
      "0:02",
    ]);
  });

  it("formats minutes and zero-pads seconds", () => {
    expect(getElapsedTimeTracking(65)).toBe("1:05");
    expect(getElapsedTimeTracking(600)).toBe("10:00");
  });

  it.each([
    ["NaN", NaN],
    ["Infinity", Infinity],
  ])("reads %s as 0:00", (_label, value) => {
    expect(getElapsedTimeTracking(value)).toBe("0:00");
  });
});

describe("getTimeTracking", () => {
  it("rounds a track length to the nearest second", () => {
    expect(getTimeTracking(215.4)).toBe("3:35");
    expect(getTimeTracking(215.6)).toBe("3:36");
  });

  it("formats minutes and zero-pads seconds", () => {
    expect(getTimeTracking(65)).toBe("1:05");
  });

  it.each([
    ["NaN", NaN],
    ["Infinity", Infinity],
  ])("reads %s as 0:00", (_label, value) => {
    expect(getTimeTracking(value)).toBe("0:00");
  });
});
