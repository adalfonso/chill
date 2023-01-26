import { UserSettings } from "@common/models/User";
import { client } from "../client";

export const UserApi = {
  get: () => client.user.get.query(),

  updateSettings: (update: Partial<UserSettings>) =>
    client.user.settings.mutate(update),
};
