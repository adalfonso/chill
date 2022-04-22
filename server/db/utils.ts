import { Model, PipelineStage } from "mongoose";

interface GroupOptions {
  match: Record<string, unknown>;
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
  const prefixed_grouping = grouping.map((group) => `$${group}`);
  const match = options.match ? [{ $match: options.match }] : [];
  const group: PipelineStage[] = [
    ...match,
    {
      $group: {
        _id: prefixed_grouping,
        _count: { $sum: 1 },
      },
    },
  ];

  const result = await model.aggregate(group).sort({ _id: "asc" });

  return result.map((result) => {
    const group_record = grouping.reduce((carry, category, index) => {
      return { ...carry, [category]: result._id[index] };
    }, {});

    return {
      _group_by: grouping,
      ...result,
      ...group_record,
    };
  });
};
