const configured = (import.meta.env.VITE_SERVER_URL ?? "").replace(/\/$/, "");

export const serverHttpBase = (): string => configured;

export const apiUrl = (path: string): string => `${configured}${path}`;

export const websocketUrl = (path: string): string => {
  if (configured) {
    const wsBase = configured.replace(/^http/, "ws");
    return `${wsBase}${path}`;
  }
  const protocol = window.location.protocol === "http:" ? "ws" : "wss";
  return `${protocol}://${window.location.host}${path}`;
};
