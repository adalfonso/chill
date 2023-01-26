import { AdminApi } from "@client/api/AdminApi";
import { SyntheticEvent, useState } from "react";

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
      const response = await AdminApi.inviteUser(email);
      setEmail("");

      alert(response);
    } catch ({ message }) {
      alert(`Failed in invite user: ${message}`);
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
