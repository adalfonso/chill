import { useEffect, useState } from "react";
import { useLocation, useNavigate, Location } from "react-router-dom";

/**
 * Override behavior when the page location changes
 *
 * @param override_when - override when this evaluates to true
 * @param callback - callback action to use when we override
 */
export const useLocationOverride = (
  override_when: () => boolean,
  callback: () => void,
) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [last_location, setLastLocation] = useState<Location>();

  useEffect(() => {
    if (!override_when()) {
      return setLastLocation(location);
    }

    // Should not happen
    if (last_location === undefined) {
      return;
    }

    const { pathname, search } = last_location;

    navigate(pathname + search);
    callback();
  }, [location]);
};

/**
 * Hook the back navigation
 *
 * @param useWhen - use this hook when the value is true
 * @param onBack - action to perform when navigating back
 */
export const useOnBackNavigate = (
  useWhen: () => boolean,
  onBack: () => void,
) => {
  useEffect(() => {
    if (!useWhen()) {
      return;
    }

    window.history.pushState(
      "__fullscreen__",
      document.title,
      window.location.href,
    );

    addEventListener("popstate", onBack);

    return () => {
      removeEventListener("popstate", onBack);

      if (window.history.state === "__fullscreen__") {
        window.history.back();
      }
    };
  }, [useWhen()]);
};
