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
      await AdminApi.inviteUser(email);
      setEmail("");

      alert(`Successfully invited user`);
    } catch (e) {
      alert(`Failed in invite user: ${e.response.data}`);
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
