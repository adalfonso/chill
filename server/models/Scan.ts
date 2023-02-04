import { Scan as IScan, ScanStatus } from "@common/models/Scan";
import { timestamps } from "./Base";
import { model, Schema } from "mongoose";

const ScanSchema = new Schema<IScan>(
  {
    status: {
      type: String,
      enum: Object.values(ScanStatus),
      default: ScanStatus.Active,
    },
    records_written: { type: Number, required: true, default: 0 },
    completed_at: { type: Date, default: null },
  },
  { timestamps, collection: "scan" },
);

export const Scan = model<IScan>("Scan", ScanSchema);
