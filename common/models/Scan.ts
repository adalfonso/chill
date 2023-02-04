import { Base } from "./Base";
import { Nullable, ObjectValues } from "../types";

export const ScanStatus = {
  Active: "ACTIVE",
  Failed: "FAILED",
  Completed: "COMPLETED",
} as const;

export type ScanStatus = ObjectValues<typeof ScanStatus>;

export interface Scan extends Base {
  status: ScanStatus;
  records_written: number;
  completed_at: Nullable<Date>;
}
