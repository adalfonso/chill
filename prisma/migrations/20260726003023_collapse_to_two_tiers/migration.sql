-- Medium is retired (see ADR-0007): High is near-transparent and Low is the
-- only meaningfully smaller option, so Medium sat in between without earning
-- its own tier. Existing Medium renditions/jobs can't be remapped to a
-- different bitrate without re-encoding, so they're dropped here; the
-- rendition cache is a disposable, wipeable cache (ADR-0006) and Low will be
-- generated eagerly to replace them.
DELETE FROM "RenditionJob" WHERE "tier" = 'Medium';
DELETE FROM "Rendition" WHERE "tier" = 'Medium';

CREATE TYPE "RenditionTier_new" AS ENUM ('High', 'Low');

ALTER TABLE "Rendition" ALTER COLUMN "tier" TYPE "RenditionTier_new" USING ("tier"::text::"RenditionTier_new");
ALTER TABLE "RenditionJob" ALTER COLUMN "tier" TYPE "RenditionTier_new" USING ("tier"::text::"RenditionTier_new");

DROP TYPE "RenditionTier";
ALTER TYPE "RenditionTier_new" RENAME TO "RenditionTier";

-- Existing users on Medium move to High rather than Low: High measured as
-- indistinguishable from source in listening tests, so it's the safer
-- default when a user's explicit tier disappears out from under them.
CREATE TYPE "AudioQuality_new" AS ENUM ('Original', 'High', 'Low');

ALTER TABLE "UserSettings" ALTER COLUMN "audio_quality" DROP DEFAULT;

ALTER TABLE "UserSettings" ALTER COLUMN "audio_quality" TYPE "AudioQuality_new" USING (
  CASE "audio_quality"::text
    WHEN 'Medium' THEN 'High'
    ELSE "audio_quality"::text
  END
)::"AudioQuality_new";

DROP TYPE "AudioQuality";
ALTER TYPE "AudioQuality_new" RENAME TO "AudioQuality";

ALTER TABLE "UserSettings" ALTER COLUMN "audio_quality" SET DEFAULT 'Original'::"AudioQuality";
