import { client } from "../client";

export const AdminApi = {
  inviteUser: client.admin.invite_user.mutate,
};
