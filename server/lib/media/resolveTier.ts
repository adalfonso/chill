import { AudioQuality, AUDIO_QUALITY_TARGET_KBPS } from "@common/types";

const LOSSLESS_TYPES = new Set(["flac", "wav", "aiff", "alac"]);

/**
 * No-tandem rule: skip re-encoding a lossy source once it's already at/near
 * the target tier's data cost. Reproduces ADR-0002's examples exactly (128k
 * mp3 skips low/medium/high; 320k mp3 skips only high).
 */
const NO_TANDEM_MULTIPLIER = 2;

export type TierResolution =
  | { convert: false }
  | { convert: true; target_kbps: number };

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
