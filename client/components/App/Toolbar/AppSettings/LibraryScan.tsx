import { useSignal } from "@preact/signals";

import { api } from "@client/client";

export const LibraryScan = () => {
  const is_busy = useSignal(false);

  // Cause file scanner to run
  // TODO: can this be refactored to use useFetch?
  const scan = async () => {
    if (is_busy.value) {
      return;
    }

    if (!confirm("Are you sure you want to run a scan?")) {
      return;
    }

    is_busy.value = true;

    try {
      await api.media.scan.mutate();
    } catch (error) {
      console.error(`Failed to start library scan:`, error);
    } finally {
      is_busy.value = false;
    }
  };

  return (
    <div className="setting-scan-library setting">
      <h2>Scan library files</h2>
      <div className="link setting" onMouseUp={scan}>
        Run Scan Now!
      </div>
    </div>
  );
};
