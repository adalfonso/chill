import { SyntheticEvent, useState } from "react";

import { api } from "@client/client";

export const InviteUser = () => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const sendInvite = async (e: SyntheticEvent) => {
    e.preventDefault();

    if (busy) {
      return;
    }

    if (!email) {
      return;
    }

    setBusy(true);

    try {
      const response = await api.admin.invite_user.mutate(email);
      setEmail("");

      alert(response);
    } catch (e) {
      alert(`Failed in invite user: ${(e as Error)?.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={sendInvite}>
      <p>Invite new user to Chill:</p>
      <input
        type="email"
        name="invite-email"
        value={email}
        required
        onChange={(e) => setEmail(e.target.value)}
      />
      <input type="submit" />
    </form>
  );
};
