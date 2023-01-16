import { User as UserClass } from "../../common/models/User.js";
import { getModelForClass } from "@typegoose/typegoose";
import { timestamps } from "./Base.mjs";

export const User = getModelForClass(UserClass, {
  schemaOptions: { timestamps, collection: "user" },
});
