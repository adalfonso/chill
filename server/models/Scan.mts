import { Scan as ScanClass } from "../../common/models/Scan.js";
import { getModelForClass } from "@typegoose/typegoose";
import { timestamps } from "./Base.mjs";

export const Scan = getModelForClass(ScanClass, {
  schemaOptions: { timestamps, collection: "scan" },
});
