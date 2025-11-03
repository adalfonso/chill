import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "preact/hooks";

import "./App.scss";
import { AppRouter } from "./components/App/AppRouter";
import { PlayControls } from "./components/App/PlayControls";
import { PlayModeIterceptor } from "./components/App/PlayModeIntercepter";
import { PlaylistEditor } from "./components/App/PlaylistEditor";
import { Toolbar } from "./components/App/Toolbar";
import { api } from "./client";
import { getPlayerState, getPlaylistEditorState } from "@reducers/store";
import { setCastAppId } from "./state/reducers/caster";
import { setMenu } from "@reducers/mediaMenu";

export const App = () => {
  const dispatch = useDispatch();
  const clearActiveFileMenu = () => dispatch(setMenu(null));
  const player = useSelector(getPlayerState);
  const playlistEditor = useSelector(getPlaylistEditorState);
  useEffect(() => {
    unlockAudio();
    api.cast.getCastId.query().then((id) => dispatch(setCastAppId(id)));
  }, []);

  return (
    <div className="app" onClick={clearActiveFileMenu}>
      <audio id="unlock-audio" src="" preload="auto" muted></audio>
      <Toolbar />

      <PlayModeIterceptor>
        <AppRouter />
      </PlayModeIterceptor>

      {player.playlist?.length > 0 && <PlayControls />}
      {playlistEditor.active && <PlaylistEditor />}
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
