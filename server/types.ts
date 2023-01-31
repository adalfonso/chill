export interface GroupOptions {
  match: Record<string, unknown>;
  pagination?: {
    limit: number;
    page: number;
  };
}
