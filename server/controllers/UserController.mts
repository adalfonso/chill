import _ from "lodash";
import { AudioQuality } from "../../common/types.js";
import { Request, Response } from "express";
import { User } from "../models/User.mjs";

export const UserController = {
  get: (req: Request, res: Response) => {
    const { user } = req;

    if (!user) {
      return res.status(422).send("Could not get user");
    }

    res.json(_.pick(user, ["type", "settings"]));
  },

  updateSettings: async (req: Request, res: Response) => {
    // TODO: Fix types
    const { user } = req as any;
    const { audio_quality } = req.body.update ?? {};

    if (!user) {
      return res.status(422).send("Could not get user");
    }

    // TODO: Create a better validation strategy
    if (
      !audio_quality ||
      !Object.values(AudioQuality).includes(audio_quality)
    ) {
      return res.status(422).send("Invalid settings update");
    }

    try {
      const update = await User.updateOne(
        { _id: user._id },
        { $set: { "settings.audio_quality": audio_quality } },
      );

      if (update.modifiedCount !== 1) {
        return res.status(400).send("Unable to update settings");
      }

      const updated_user = await User.findById(user._id);

      if (updated_user === null) {
        return res
          .status(400)
          .send(
            "Updated user settings successfully but failed to respond with refreshed settings",
          );
      }

      console.info("User settings updated", { audio_quality });

      res.json(updated_user.settings);
    } catch (e) {
      console.error("Failed to update user settings: ", e);
      res.sendStatus(500);
    }
  },
};
