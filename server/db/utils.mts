import _ from "lodash";
import { Model, PipelineStage } from "mongoose";

interface GroupOptions {
  match: Record<string, unknown>;
  pagination?: {
    limit: number;
    page: number;
  };
}

/**
 * Perform a common DB select with a group by
 *
 * @param model Data Model
 * @param grouping Grouping feilds
 * @param options Additional aggregation options
 * @returns grouped data
 */
export const getAsGroup = async <M extends Model<S>, S>(
  model: M,
  grouping: (keyof S)[],
  options: Partial<GroupOptions> = {},
) => {
  const { limit = Infinity, page = 0 } = options.pagination ?? {};

  // Aggregate all grouping keys to form an _id for the aggregation
  const aggregate_id = grouping.reduce(
    (carry, group) => ({ ...carry, [group]: `$${String(group)}` }),
    {},
  );

  // Generate accumulators to select all groupings as individual fields
  const fields = grouping.reduce((carry, group) => {
    return {
      ...carry,
      [group]: { $first: "$" + String(group) },
      image: { $first: "$cover.filename" },
    };
  }, {});

  // Generate null replacements
  const null_fallback = grouping.reduce((carry, group) => {
    return {
      ...carry,
      [group]: {
        $ifNull: [
          "$" + String(group),
          `Unknown ${_.capitalize(group.toString())}`,
        ],
      },
    };
  }, {});

  const match = options.match ? [{ $match: options.match }] : [];
  const group: PipelineStage[] = [
    ...match,
    {
      $group: {
        _id: aggregate_id,
        _count: { $sum: 1 },
        ...fields,
        image: { $min: "$cover.filename" },
      },
    },
    { $project: { _id: 1, _count: 1, image: 1, ...null_fallback } },
  ];

  return model
    .aggregate(group)
    .sort({ _id: "asc" })
    .skip(page > 0 ? (page + 1) * limit : 0)
    .limit(limit);
};
