import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { Request } from "@server/trpc";
import { db } from "@server/lib/data/db";

export const schema = {
  invite: z.string().email(),
};

export const InviteController = {
  create: async ({ input: email }: Request<typeof schema.invite>) => {
    if (!/gmail\.com$/.test(email)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Email should be gmail only for now.",
      });
    }

    const existing_user = await db.user.findUnique({ where: { email } });

    if (existing_user) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User already exists with this email.",
      });
    }

    const previous_invitation = await db.invitation.findUnique({
      where: { email },
    });

    if (previous_invitation) {
      // TODO: resend email

      return `Success: ${email} was previously invited.`;
    }

    await db.invitation.create({ data: { email } });

    // TODO: send email invite to user

    return `Success: invited ${email}.`;
  },
};
