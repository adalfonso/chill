export interface Base {
  _id: string;
  created_at: Date;
  updated_at: Date;
}

// Unsave model which might not contain the base fields yet
export type Unsaved<T extends Base> = Omit<
  T,
  "_id" | "created_at" | "updated_at"
> &
  Partial<Base>;
