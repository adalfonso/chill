import * as _ from "lodash-es";
import { AudioQuality } from "@common/types";
import { Request } from "@server/trpc";
import { TRPCError } from "@trpc/server";
import { User } from "@server/models/User";
import { z } from "zod";

export const schema = {
  update_settings: z.object({
    audio_quality: z.string().optional(),
  }),
};

export const UserController = {
  get: ({ ctx: { req } }: Request) => {
    const { user } = req;

    if (!user) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Could not get user.",
      });
    }

    return _.pick(user, ["type", "settings"]);
  },

  updateSettings: async ({
    ctx: { req },
    input,
  }: Request<typeof schema.update_settings>) => {
    // TODO: Fix types
    const { user } = req as any;
    const { audio_quality } = input as any;

    if (!user) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Could not get user.",
      });
    }

    // TODO: Create a better validation strategy
    if (
      !audio_quality ||
      !Object.values(AudioQuality).includes(audio_quality)
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid settings update.",
      });
    }

    try {
      const update = await User.updateOne(
        { _id: user._id },
        { $set: { "settings.audio_quality": audio_quality } },
      );

      if (update.modifiedCount !== 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unable to update settings.",
        });
      }

      const updated_user = await User.findById(user._id);

      if (updated_user === null) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Updated user settings successfully but failed to respond with refreshed settings.",
        });
      }

      console.info("User settings updated", { audio_quality });

      return updated_user.settings;
    } catch (e) {
      console.error("Failed to update user settings: ", e);

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  },
};
