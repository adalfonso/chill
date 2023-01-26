import { Invitation } from "../models/Invitation.mjs";
import { Request } from "../trpc.mjs";
import { User } from "../models/User.mjs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const schema = {
  invite: z.string(),
};

export const InviteController = {
  create: async ({ input: email }: Request<typeof schema.invite>) => {
    // TODO: check email is valid format

    if (!/gmail\.com$/.test(email)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Email should be gmail only for now.",
      });
    }

    const existing_user = await User.findOne({ email });

    if (existing_user) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User already exists with this email.",
      });
    }

    const previous_invitation = await Invitation.findOne({ email });

    if (previous_invitation) {
      // TODO: resend email

      return `Success: ${email} was previously invited.`;
    }

    await Invitation.create({ email });

    // TODO: send email invite to user

    return `Success: invited ${email}.`;
  },
};
