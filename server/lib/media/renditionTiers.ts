import { AudioQuality, RenditionTier } from "@prisma/client";

import { AUDIO_QUALITY_TARGET_KBPS, Maybe } from "@common/types";

/**
 * RenditionTier is exactly AudioQuality minus Original, with identical string
 * values. These bridges are the single place that relationship is encoded —
 * they index one enum with the other's values, so if the enums ever drift
 * (a value added/renamed on one side only) the compiler errors here instead
 * of a hand-maintained map silently going stale.
 */

/**
 * The rendition tier that serves a quality setting
 *
 * @param quality - user's audio quality setting
 * @returns matching tier, or null for Original (never transcoded/cached)
 */
export const qualityToRenditionTier = (
  quality: AudioQuality,
): Maybe<RenditionTier> =>
  quality === AudioQuality.Original ? null : RenditionTier[quality];

/**
 * The quality setting a rendition tier corresponds to
 *
 * @param tier - rendition quality tier
 * @returns matching audio quality
 */
export const renditionTierToQuality = (tier: RenditionTier): AudioQuality =>
  AudioQuality[tier];

/**
 * Target Opus bitrate for a rendition tier
 *
 * @param tier - rendition quality tier
 * @returns target bitrate in kbps
 */
export const renditionTierTargetKbps = (tier: RenditionTier): number =>
  AUDIO_QUALITY_TARGET_KBPS[tier];
