import { DeviceInfo } from "@common/types";

const DEVICE_ID_KEY = "device_id";
const ACCESS_TOKEN_EXPIRES_AT_KEY = "access_token_expires_at";

/**
 * Get this device's persistent identifier, generating and storing one if absent
 *
 * Client-supplied per ADR-0009 KTD5: the server treats this as a cache, not
 * a source of truth, since it can vanish independently of any live session.
 *
 * @returns a stable id for this browser/device
 */
export const getDeviceId = (): string => {
  const existing = localStorage.getItem(DEVICE_ID_KEY);

  if (existing) {
    return existing;
  }

  const device_id = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, device_id);

  return device_id;
};

/**
 * Read the cached access-token expiry hint
 *
 * A cache, not a credential -- a missing or cleared hint means "refresh
 * now," never "session dead" (ADR-0009 U7).
 *
 * @returns the cached expiry as an epoch-ms timestamp, or null if unset
 */
export const getAccessTokenExpiryHint = (): number | null => {
  const raw = localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  const parsed = raw === null ? NaN : Number(raw);

  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Cache when the current access token is expected to expire
 *
 * @param expires_at - epoch-ms timestamp of the estimated expiry
 */
export const setAccessTokenExpiryHint = (expires_at: number): void => {
  localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT_KEY, String(expires_at));
};

export const getDeviceInfo = (): DeviceInfo => {
  const ua = navigator.userAgent;
  const isTouch = "ontouchstart" in window;

  let os = "Unknown";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";

  let browser = "Browser";
  if (/Chrome/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Edge/i.test(ua)) browser = "Edge";

  const type = isTouch ? "Mobile" : "Desktop";

  const device_name = localStorage.getItem("device_name") || "";

  return { type, browser, os, device_name };
};
