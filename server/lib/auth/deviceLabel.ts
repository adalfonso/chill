const MAX_DEVICE_LABEL_LENGTH = 64;

const BROWSER_TOKENS: Array<[RegExp, string]> = [
  [/Edg\//, "Edge"],
  [/OPR\//, "Opera"],
  [/CriOS\//, "Chrome"],
  [/Chrome\//, "Chrome"],
  [/FxiOS\//, "Firefox"],
  [/Firefox\//, "Firefox"],
  [/Safari\//, "Safari"],
];

const PLATFORM_TOKENS: Array<[RegExp, string]> = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Mac OS X/, "macOS"],
  [/Windows/, "Windows"],
  [/Linux/, "Linux"],
];

/**
 * Derive a short, display-safe device label from a User-Agent header
 *
 * Matched against a small fixed allowlist rather than stored verbatim --
 * the raw header is client-controlled and unbounded (ADR-0009 U2).
 *
 * @param user_agent - the request's User-Agent header
 * @returns a label like "Chrome on Windows", capped to the schema's column length
 */
export const deriveDeviceLabel = (user_agent: string): string => {
  const browser = matchToken(user_agent, BROWSER_TOKENS) ?? "Unknown browser";
  const platform =
    matchToken(user_agent, PLATFORM_TOKENS) ?? "unknown platform";

  return `${browser} on ${platform}`.slice(0, MAX_DEVICE_LABEL_LENGTH);
};

const matchToken = (user_agent: string, tokens: Array<[RegExp, string]>) =>
  tokens.find(([pattern]) => pattern.test(user_agent))?.[1];
