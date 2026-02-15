import { signal } from "@preact/signals";
import { Maybe } from "@common/types";

/** The Chromecast receiver application ID. */
export const app_id = signal<Maybe<string>>(null);

/** Whether the Cast SDK is initialized and ready. */
export const ready = signal(false);

/**
 * Sets the Cast app ID and marks the SDK as ready if the Cast framework
 * has loaded. No-ops if the ID is null or unchanged.
 *
 * @param id - The Chromecast receiver application ID
 */
export const setCastAppId = (id: Maybe<string>) => {
  if (!id || id === app_id.value) {
    return;
  }

  app_id.value = id;

  // TODO: Gracefully handle this situation
  if (!window.__chill_app.cast_ready) {
    console.error(
      "Tried to initialize caster but the SDK hasn't loaded yet",
    );
    return;
  }

  ready.value = true;
};
