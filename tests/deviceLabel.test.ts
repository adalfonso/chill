/** @jest-environment node */
import { deriveDeviceLabel } from "../server/lib/auth/deviceLabel";

const CHROME_WINDOWS_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

describe("deriveDeviceLabel", () => {
  it("derives an allowlisted browser/platform label", () => {
    expect(deriveDeviceLabel(CHROME_WINDOWS_UA)).toBe("Chrome on Windows");
  });

  it("never stores the raw header", () => {
    const weird_ua = "TotallyCustomBotThing/1.0 (rare-config; x86_64)";
    expect(deriveDeviceLabel(weird_ua)).not.toContain("TotallyCustomBotThing");
  });
});
