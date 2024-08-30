import { useState } from "preact/hooks";

import { api } from "@client/client";

export const InviteUser = () => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const sendInvite = async () => {
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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sendInvite();
      }}
    >
      <p>Invite new user to Chill:</p>
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
