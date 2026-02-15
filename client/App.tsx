import { useSelector } from "react-redux";
import { useEffect, useRef } from "preact/hooks";

import "./App.scss";
import { AppRouter } from "./components/App/AppRouter";
import { CoreViewState } from "./state/AppState";
import { PlayControls } from "./components/App/PlayControls";
import { PlayModeIterceptor } from "./components/App/PlayModeIntercepter";
import { PlaylistEditor } from "./components/App/PlaylistEditor";
import { ToolbarBottom } from "./components/App/ToolbarBottom";
import { ToolbarTop } from "./components/App/ToolbarTop";
import { api } from "./client";
import { effect } from "@preact/signals";
import { getPlayerState } from "@reducers/store";
import { setCastAppId } from "@client/state/casterStore";
import { setMenu } from "@client/state/mediaMenuStore";
import * as playlistEditorStore from "@client/state/playlistEditorStore";
import { useAppState } from "@hooks/useAppState";

export const App = () => {
  const { view, view_path } = useAppState();
  const prev_view_path = useRef("");
  const clearActiveFileMenu = () => setMenu(null);
  const player = useSelector(getPlayerState);
  useEffect(() => {
    unlockAudio();
    api.cast.getCastId.query().then(setCastAppId);
  }, []);

  effect(() => {
    const prev = prev_view_path.current;
    const current = view_path.value;

    if (prev !== current) {
      // Set the view to 'router' for any urls that aren't for the library
      // This assumes the url is for a native router view
      if (/^(?!\/library).*/.test(view_path.value)) {
        view.value = CoreViewState.Router;
      }
    }

    // Update prev LAST
    prev_view_path.current = current;
  });

  return (
    <div
      id="app"
      onClick={clearActiveFileMenu}
      className={"view-" + view.value}
    >
      <audio id="unlock-audio" src="" preload="auto" muted></audio>
      <ToolbarTop />
      <PlayModeIterceptor>
        <AppRouter />
      </PlayModeIterceptor>

      {player.playlist?.length > 0 && <PlayControls />}
      {playlistEditorStore.active.value && <PlaylistEditor />}
      <ToolbarBottom />
    </div>
  );
};

const unlockAudio = () => {
  const el = document.getElementById("unlock-audio") as HTMLAudioElement | null;

  if (!el) return;

  // If already unlocked, do nothing
  if (el.dataset.unlocked === "true") return;

  // Attempt playback
  el.play()
    .then(() => {
      el.pause(); // stop immediately
      el.muted = false; // restore audio for real use
      el.dataset.unlocked = "true";
      console.info("✅ Audio unlocked");
      // Remove listeners after success
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    })
    .catch((err) => {
      console.warn("⚠️ Unlock failed:", err);
    });
};

// Attach global unlock listeners
document.addEventListener("click", unlockAudio);
document.addEventListener("touchstart", unlockAudio);
document.addEventListener("keydown", unlockAudio);
