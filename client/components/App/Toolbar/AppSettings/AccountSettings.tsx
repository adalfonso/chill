import { useSignal } from "@preact/signals";

import { redirectToLogin } from "@client/lib/auth/refresh";

export const AccountSettings = () => {
  const is_busy = useSignal(false);
  const error = useSignal("");

  const logout = () => {
    if (is_busy.value) {
      return;
    }

    is_busy.value = true;
    error.value = "";

    fetch("/auth/logout", {
      method: "POST",
      headers: { "X-Requested-With": "fetch" },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to log out");
        }

        redirectToLogin();
      })
      .catch(() => {
        error.value = "Failed to log out. Please try again.";
        is_busy.value = false;
      });
  };

  return (
    <div className="setting-account setting">
      <h2>Account settings</h2>
      {error.value && <div className="ui-error">{error.value}</div>}
      <button className="regular" onClick={logout}>
        Log Out
      </button>
    </div>
  );
};
