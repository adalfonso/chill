import { DeviceInfo } from "@common/types";

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

  return { type, browser, os };
};
