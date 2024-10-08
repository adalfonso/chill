import { useDispatch, useSelector } from "react-redux";

import { getMediaMenuState } from "@reducers/store";
import { setMenu as setMediaMenu } from "@reducers/mediaMenu";

/**
 * Handles menu control
 *
 * @param menu_id - ID of the menu
 * @returns functions to control the menu
 */
export const useMenu = (menu_id: string) => {
  const dispatch = useDispatch();
  const mediaMenu = useSelector(getMediaMenuState);

  const is_active = mediaMenu.menu_id === menu_id;
  const set = () => dispatch(setMediaMenu(menu_id));
  const clear = () => dispatch(setMediaMenu(null));
  const toggle = is_active ? clear : set;

  return { is_active, set, clear, toggle };
};
