import { AudioQuality } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { Request } from "@server/trpc";
import { db } from "@server/lib/data/db";

export const schema = {
  update_settings: z.object({
    audio_quality: z.nativeEnum(AudioQuality).optional(),
  }),
};

export const UserController = {
  get: async ({ ctx: { req } }: Request) => {
    const { user } = req;

    if (!user) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Could not get user.",
      });
    }

    const settings = await db.userSettings.findUnique({
      where: { user_id: user.id },
      select: { audio_quality: true },
    });

    return {
      type: user.type,
      settings,
    };
  },

  updateSettings: async ({
    ctx: { req },
    input,
  }: Request<typeof schema.update_settings>) => {
    const { user } = req;
    const { audio_quality } = input;

    if (!user) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Could not get user.",
      });
    }

    try {
      const updated_settings = await db.userSettings.update({
        where: { user_id: user.id },
        data: { audio_quality },
        select: { audio_quality: true },
      });

      console.info("User settings updated", { audio_quality });

      return updated_settings;
    } catch (e) {
      console.error("Failed to update user settings: ", e);

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  },
};
