import { signal } from "@preact/signals";
import { Maybe } from "@common/types";

/** The ID of the currently active context menu, or null if none is open. */
export const menu_id = signal<Maybe<string>>(null);

/**
 * Sets the active menu by ID, or clears it by passing null.
 *
 * @param id - The menu ID to activate, or null to close all menus
 */
export const setMenu = (id: Maybe<string>) => {
  menu_id.value = id;
};
