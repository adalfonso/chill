export declare global {
  interface Window {
    __chill_app: {
      cast_ready: boolean;
    };
  }
}

declare module "preact" {
  namespace JSX {
    interface IntrinsicElements {
      "google-cast-launcher": unknown;
    }
  }
}
