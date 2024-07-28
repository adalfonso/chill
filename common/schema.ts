import { z } from "zod";
import { PaginationSort } from "./types";

export const pagination_schema = z.object({
  limit: z.number().int(),
  page: z.number().int(),
  sortBy: z.string().optional(),
  sort: z.nativeEnum(PaginationSort),
});
