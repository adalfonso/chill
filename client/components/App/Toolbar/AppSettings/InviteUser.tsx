import { useState } from "preact/hooks";

import { api } from "@client/client";
import { useSignal } from "@preact/signals";

export const InviteUser = () => {
  const [email, setEmail] = useState("");
  const is_busy = useSignal(false);

  const sendInvite = async () => {
    if (is_busy.value) {
      return;
    }

    if (!email) {
      return;
    }

    is_busy.value = true;

    try {
      const response = await api.admin.invite_user.mutate(email);
      setEmail("");

      alert(response);
    } catch (e) {
      alert(`Failed in invite user: ${(e as Error)?.message}`);
    } finally {
      is_busy.value = false;
    }
  };

  return (
    <form
      className="setting-invite-user setting"
      onSubmit={(e) => {
        e.preventDefault();
        sendInvite();
      }}
    >
      <h2>Invite a user</h2>
      <input
        type="email"
        name="invite-email"
        value={email}
        required
        onChange={(e) => setEmail((e.target as HTMLInputElement).value ?? "")}
      />
      <input type="submit" />
    </form>
  );
};
