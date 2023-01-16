import { Invitation as InvitationClass } from "../../common/models/Invitation.js";
import { getModelForClass } from "@typegoose/typegoose";
import { timestamps } from "./Base.mjs";

export const Invitation = getModelForClass(InvitationClass, {
  schemaOptions: { timestamps, collection: "invitation" },
});
