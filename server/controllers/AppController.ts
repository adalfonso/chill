import { env } from "@server/init";

export const AppController = {
  getCastId: () => env.CAST_APP_ID,
};
