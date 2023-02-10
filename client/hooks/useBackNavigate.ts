import { useEffect, useId } from "react";

/**
 * Hook the back navigation
 *
 * @param useWhen - use this hook when the value is true
 * @param onBack - action to perform when navigating back
 */
export const useBackNavigate = (useWhen: () => boolean, onBack: () => void) => {
  const id = useId();
  const route = `__fullscreen__${id}`;

  useEffect(() => {
    if (!useWhen()) {
      return;
    }

    window.history.pushState(route, document.title, window.location.href);

    addEventListener("popstate", onBack);

    return () => {
      removeEventListener("popstate", onBack);

      if (window.history.state === "__fullscreen__") {
        window.history.back();
      }
    };
  }, [useWhen()]);
};
