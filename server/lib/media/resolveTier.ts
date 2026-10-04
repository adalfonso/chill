import { AudioQuality, AUDIO_QUALITY_TARGET_KBPS } from "@common/types";

const LOSSLESS_TYPES = new Set(["flac", "wav", "aiff", "alac"]);

/**
 * No-tandem rule: skip re-encoding a lossy source once it's already at/near
 * the target tier's data cost. Reproduces ADR-0002's examples exactly (128k
 * mp3 skips low/high; 320k mp3 skips only high).
 */
const NO_TANDEM_MULTIPLIER = 2;

/**
 * FLAC below this bit depth can't be decoded by WebKit's native decoder
 * (Safari, every iOS browser), though other engines play it fine.
 */
const MIN_PORTABLE_FLAC_BITS = 16;

export type TierResolution =
  { convert: false } | { convert: true; target_kbps: number };

/**
 * Decide whether a track needs transcoding for a requested quality tier, and
 * at what bitrate.
 *
 * @param requested - the quality tier being requested
 * @param source - the source file's type and measured average bitrate
 * @returns whether to convert, and the target bitrate if so
 */
export const resolveTier = (
  requested: AudioQuality,
  source: { file_type: string; effective_kbps: number },
): TierResolution => {
  if (requested === AudioQuality.Original) {
    return { convert: false };
  }

  const target_kbps = AUDIO_QUALITY_TARGET_KBPS[requested];
  const is_lossless = LOSSLESS_TYPES.has(source.file_type.toLowerCase());

  if (
    !is_lossless &&
    source.effective_kbps <= target_kbps * NO_TANDEM_MULTIPLIER
  ) {
    return { convert: false };
  }

  return { convert: true, target_kbps };
};

/**
 * Pick the quality tier to actually serve a track at
 *
 * Normally the user's setting. The exception is a track whose source format
 * some clients can't decode (8-bit FLAC fails on WebKit): a user on Original
 * would get it streamed untouched and hit silent playback failure, so it is
 * bumped to High, which transcodes to Opus. An explicit Low/High setting is
 * respected as-is. Zero bit depth means unknown (the crawler's fallback
 * estimate) and is never treated as undecodable.
 *
 * @param requested - the user's quality setting
 * @param source - the source file's type and bit depth
 * @returns the quality tier to serve
 */
export const effectiveQuality = (
  requested: AudioQuality,
  source: { file_type: string; bits_per_sample: number },
): AudioQuality => {
  const is_undecodable_flac =
    source.file_type.toLowerCase() === "flac" &&
    source.bits_per_sample > 0 &&
    source.bits_per_sample < MIN_PORTABLE_FLAC_BITS;

  return requested === AudioQuality.Original && is_undecodable_flac
    ? AudioQuality.High
    : requested;
};
