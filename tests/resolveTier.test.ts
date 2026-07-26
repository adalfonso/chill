import { resolveTier } from "../server/lib/media/resolveTier";
import { AudioQuality } from "../common/types";

describe("resolveTier", () => {
  it("never converts when original is requested", () => {
    expect(
      resolveTier(AudioQuality.Original, {
        file_type: "flac",
        effective_kbps: 1000,
      }),
    ).toEqual({ convert: false });
  });

  describe("lossless sources always convert", () => {
    it.each([
      [AudioQuality.Low, 64],
      [AudioQuality.High, 160],
    ])("%s -> target %ikbps", (requested, target_kbps) => {
      expect(
        resolveTier(requested, { file_type: "flac", effective_kbps: 1000 }),
      ).toEqual({ convert: true, target_kbps });
    });
  });

  describe("ADR-0002 no-tandem examples", () => {
    it.each([
      // [source kbps, requested tier, expected]
      [128, AudioQuality.Low, { convert: false }],
      [128, AudioQuality.High, { convert: false }],
      [320, AudioQuality.Low, { convert: true, target_kbps: 64 }],
      [320, AudioQuality.High, { convert: false }],
    ])(
      "%ikbps mp3 requesting %s -> %o",
      (effective_kbps, requested, expected) => {
        expect(
          resolveTier(requested, { file_type: "mp3", effective_kbps }),
        ).toEqual(expected);
      },
    );
  });

  it("applies the same threshold regardless of lossy codec", () => {
    expect(
      resolveTier(AudioQuality.Low, {
        file_type: "aac",
        effective_kbps: 256,
      }),
    ).toEqual({ convert: true, target_kbps: 64 });
  });
});
