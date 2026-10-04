interface ChillApp {
  cast_ready: boolean;
}

interface Window {
  __chill_app: ChillApp;
}

declare namespace preact.JSX {
  interface IntrinsicElements {
    "google-cast-launcher": preact.JSX.HTMLAttributes<HTMLElement>;
  }
}
