import { useMemo } from "react";
import { useLocation } from "react-router-dom";

/**
 * Gets query params from URL
 *
 * @returns query params
 */
export const useQuery = () => {
  const { search } = useLocation();

  return useMemo(() => new URLSearchParams(search), [search]);
};
