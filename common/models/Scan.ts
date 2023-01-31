import { Base } from "./Base.js";
import { Nullable, ObjectValues } from "../types.js";
import { prop } from "@typegoose/typegoose";

export const ScanStatus = {
  Active: "ACTIVE",
  Failed: "FAILED",
  Completed: "COMPLETED",
} as const;

export type ScanStatus = ObjectValues<typeof ScanStatus>;

export class Scan extends Base {
  @prop({ default: ScanStatus.Active })
  public status!: ScanStatus;

  @prop({ required: true, default: 0 })
  public records_written!: number;

  @prop({ default: null })
  public completed_at!: Nullable<Date>;
}
