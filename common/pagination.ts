import { PaginationOptions, PaginationSort } from "./types";

const DEFAULT_LIMIT = 24;
const DEFAULT_PAGE = 0;
const DEFAULT_SORT = PaginationSort.asc;

export const paginate = (
  options: Partial<PaginationOptions> = {},
): PaginationOptions => ({
  limit: options.limit ?? DEFAULT_LIMIT,
  page: options.page ?? DEFAULT_PAGE,
  sortBy: options.sortBy,
  sort: options.sort ?? DEFAULT_SORT,
});
