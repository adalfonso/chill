import { UserSettings } from "@common/models/User";
import axios from "axios";

const v1 = `/api/v1`;

export const UserApi = {
  get: () => axios.get(`${v1}/user`),

  updateSettings: (update: Partial<UserSettings>) =>
    axios.patch(`${v1}/user/settings`, { update }),
};
