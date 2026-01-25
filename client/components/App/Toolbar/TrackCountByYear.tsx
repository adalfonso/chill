import { computed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

import { api } from "@client/client";

export const TrackCountByYear = () => {
  const counts = useSignal<Array<{ year: number; count: number }>>([]);

  const largest_count = computed(() =>
    counts.value.reduce(
      (max, item) => (item.count > max ? item.count : max),
      0,
    ),
  );

  useEffect(() => {
    api.libraryHealth.trackCountByYear
      .query()
      .then((result) => (counts.value = result));
  }, []);

  return counts.value.map(({ year, count }) => {
    const width_percent = largest_count.value
      ? (count / largest_count.value) * 100
      : 0;

    return (
      <div className="setting-track-count-by-year" key={year}>
        <div style={`width: ${width_percent}%`}>
          <div>
            {year} <span>({count})</span>
          </div>
        </div>
      </div>
    );
  });
};
