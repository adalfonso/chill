import { Base } from "./Base.js";
import { Nullable } from "../types.js";
import { prop } from "@typegoose/typegoose";

export enum ScanStatus {
  Active = "ACTIVE",
  Failed = "FAILED",
  Completed = "COMPLETED",
}

export class Scan extends Base {
  @prop({ default: ScanStatus.Active })
  public status!: ScanStatus;

  @prop({ required: true, default: 0 })
  public records_written!: number;

  @prop({ default: null })
  public completed_at!: Nullable<Date>;
}
