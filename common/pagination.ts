import { PaginationOptions } from "./types";

export const DEFAULT_LIMIT = 24;
export const DEFAULT_PAGE = 0;
export const DEFAULT_OFFSET = 0;

export const paginate = (
  options: Partial<PaginationOptions> = {},
): PaginationOptions => ({
  limit: options.limit ?? DEFAULT_LIMIT,
  page: options.page ?? DEFAULT_PAGE,
  sort: options.sort ?? [],
  offset: options.offset ?? DEFAULT_OFFSET,
});
