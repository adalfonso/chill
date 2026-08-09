import { env } from "@server/init";
import { Request } from "@server/trpc";

export const CastController = {
  getCastId: () => env.CAST_APP_ID,
  getAppClients: ({ ctx: { req } }: Request) => {
    const { id, session_id } = req._user;

    return req.app._wss.getClientDevicesByUserId(id, session_id);
  },
};
