import axios from "axios";

const v1 = `/api/v1`;

export const AdminApi = {
  get: () => axios.get(`${v1}/user`),

  inviteUser: (email: string) => axios.post(`${v1}/admin/invite`, { email }),
};
