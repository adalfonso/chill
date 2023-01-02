import { Invitation } from "@server/models/Invitation";
import { Request, Response } from "express";
import { User } from "@server/models/User";

export const InviteController = {
  create: async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(422).send("Missing email");
    }

    // TODO: check email is valid format

    if (!/gmail\.com$/.test(email)) {
      return res.status(422).send("Email should be gmail only for now");
    }

    const existing_user = await User.findOne({ email });

    if (existing_user) {
      return res.status(422).send("User already exists with this email");
    }

    const previous_invitation = await Invitation.findOne({ email });

    if (previous_invitation) {
      // TODO: resend email

      return res.status(201).send("success - previously created");
    }

    await Invitation.create({ email });

    // TODO: send email invite to user

    res.status(201).send("success - created");
  },
};
