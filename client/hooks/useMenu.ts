import * as mediaMenuStore from "@client/state/mediaMenuStore";

/**
 * Handles menu control
 *
 * @param menu_id - ID of the menu
 * @returns functions to control the menu
 */
export const useMenu = (menu_id: string) => {
  const is_active = mediaMenuStore.menu_id.value === menu_id;
  const set = () => mediaMenuStore.setMenu(menu_id);
  const clear = () => mediaMenuStore.setMenu(null);
  const toggle = is_active ? clear : set;

  return { is_active, set, clear, toggle };
};
