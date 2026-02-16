import { signal } from "@preact/signals";

/** Whether the playlist editor modal is open. */
export const active = signal(false);

/** The track IDs selected for adding to a playlist. */
export const track_ids = signal<Array<number>>([]);

/**
 * Toggles the playlist editor. When opening, sets the track IDs to add.
 * When closing, clears the track IDs.
 *
 * @param ids - The track IDs to add to a playlist
 */
export const toggle = (ids: { track_ids: Array<number> }) => {
  active.value = !active.value;
  track_ids.value = active.value ? ids.track_ids : [];
};
