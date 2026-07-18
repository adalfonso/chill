CREATE TYPE "AudioQuality_new" AS ENUM ('Original', 'High', 'Medium', 'Low');

ALTER TABLE "UserSettings" ALTER COLUMN "audio_quality" DROP DEFAULT;

ALTER TABLE "UserSettings" ALTER COLUMN "audio_quality" TYPE "AudioQuality_new" USING (
  CASE "audio_quality"::text
    WHEN 'Trash' THEN 'Low'
    WHEN 'Low' THEN 'Low'
    WHEN 'Medium' THEN 'Medium'
    WHEN 'Standard' THEN 'Medium'
    WHEN 'Extreme' THEN 'High'
    WHEN 'Original' THEN 'Original'
  END
)::"AudioQuality_new";

DROP TYPE "AudioQuality";
ALTER TYPE "AudioQuality_new" RENAME TO "AudioQuality";

ALTER TABLE "UserSettings" ALTER COLUMN "audio_quality" SET DEFAULT 'Original'::"AudioQuality";
