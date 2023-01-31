import _ from "lodash";
import { BeAnObject } from "@typegoose/typegoose/lib/types.js";
import { GroupOptions } from "@server/types.js";
import { GroupedMedia } from "@common/types.js";
import { Media } from "../../common/models/Media.js";
import { PipelineStage } from "mongoose";
import { ReturnModelType } from "@typegoose/typegoose";

/**
 * Perform a common DB select with a groupBy
 *
 * @param model Data Model
 * @param grouping Grouping fields
 * @param options Additional aggregation options
 * @returns grouped data
 */
export const getAsGroup = async (
  model: ReturnModelType<typeof Media, BeAnObject>,
  grouping: (keyof Media)[],
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
    .aggregate<GroupedMedia>(group)
    .sort({ _id: "asc" })
    .skip(page > 0 ? (page + 1) * limit : 0)
    .limit(limit);
};
