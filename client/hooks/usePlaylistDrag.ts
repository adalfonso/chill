import { useRef } from "preact/hooks";

import { PlayableTrack } from "@common/types";
import { api } from "@client/client";
import { getPlaylistTracks } from "@client/lib/TrackLoaders";

type DragState = {
  current_index: number;
  active: boolean;
  start_y: number;
};

type UsePlaylistDragArgs = {
  playlist_id: number;
  container: { current: HTMLDivElement | null };
  tracks_ref: { current: PlayableTrack[] | null };
  setTracks: (fn: (prev: PlayableTrack[]) => PlayableTrack[]) => void;
  setDraggedIndex: (index: number | null) => void;
};

// Pixels of pointer movement before a press becomes a drag.
const DRAG_ACTIVATION_PX = 5;

/**
 * Persists the current track order to the server. On failure, reloads the
 * server-authoritative order and resets local state via `setTracks`.
 */
const makePersistOrder =
  (
    playlist_id: number,
    tracks_ref: { current: PlayableTrack[] | null },
    setTracks: (fn: (prev: PlayableTrack[]) => PlayableTrack[]) => void,
  ) =>
  async () => {
    const order_snapshot = tracks_ref.current ?? [];
    try {
      await api.playlist.update.mutate({
        id: playlist_id,
        mode: "replace",
        track_ids: order_snapshot.map((track) => track.id),
      });
    } catch (e) {
      console.error("Failed to reorder playlist:", (e as Error)?.message);
      const reloaded = await getPlaylistTracks(
        { playlist_id },
        { limit: order_snapshot.length },
      );
      setTracks(() => reloaded);
    }
  };

/**
 * Provides pointer event handlers for drag-to-reorder playlist rows.
 *
 * Pointer capture is set on the container (not the handle) so events keep
 * flowing even when the pointer leaves the handle mid-drag. Rows are spliced
 * in real time as the pointer passes over them, and the final order is
 * persisted to the server on drag end.
 *
 * @returns `onPointerDown`, `onPointerMove`, and `endDrag` to wire onto the
 * container element's pointer event props.
 */
export const usePlaylistDrag = ({
  playlist_id,
  container,
  tracks_ref,
  setTracks,
  setDraggedIndex,
}: UsePlaylistDragArgs) => {
  const drag = useRef<DragState | null>(null);
  const persistOrder = makePersistOrder(playlist_id, tracks_ref, setTracks);

  // Finalize a drag. Idempotent, so it's safe to wire to pointerup,
  // pointercancel, and lostpointercapture (whichever the browser delivers).
  const endDrag = () => {
    const d = drag.current;
    if (!d) {
      return;
    }
    drag.current = null;
    setDraggedIndex(null);
    if (!d.active) {
      return;
    }

    // Suppress the click that may follow drag end (browsers vary)
    const suppress = (ev: MouseEvent) => {
      ev.stopPropagation();
      ev.preventDefault();
      window.removeEventListener("click", suppress, true);
    };
    window.addEventListener("click", suppress, true);
    setTimeout(() => window.removeEventListener("click", suppress, true), 50);

    persistOrder();
  };

  // Capture on the (stable) container rather than the handle: the handle's row
  // moves during reordering, which would break capture mid-drag. The container
  // never reorders, so capture survives and events keep flowing even after the
  // pointer leaves the handle.
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) {
      return;
    }

    const target = e.target as Element | null;
    if (!target?.closest(".drag-handle")) {
      return;
    }

    const row = target.closest("[data-row-index]") as HTMLElement | null;
    if (!row || row.dataset.rowIndex === undefined) {
      return;
    }

    const index = Number(row.dataset.rowIndex);
    if (Number.isNaN(index)) {
      return;
    }

    container.current?.setPointerCapture(e.pointerId);
    drag.current = { current_index: index, active: false, start_y: e.clientY };
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) {
      return;
    }

    // The button was released while we weren't notified (e.g. released outside
    // the window). Catch it the moment the pointer reports no buttons held.
    if (e.buttons === 0) {
      endDrag();
      return;
    }

    if (!d.active) {
      if (Math.abs(e.clientY - d.start_y) < DRAG_ACTIVATION_PX) {
        return;
      }
      d.active = true;
      setDraggedIndex(d.current_index);
    }

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el?.closest("[data-row-index]") as HTMLElement | null;
    if (!row || row.dataset.rowIndex === undefined) {
      return;
    }

    const over_index = Number(row.dataset.rowIndex);
    if (Number.isNaN(over_index) || over_index === d.current_index) {
      return;
    }

    const from = d.current_index;
    setTracks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(over_index, 0, moved);
      return next;
    });
    d.current_index = over_index;
    setDraggedIndex(over_index);
  };

  return { onPointerDown, onPointerMove, endDrag };
};
