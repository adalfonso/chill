import "./ToolbarBottom.scss";
import { useLocation } from "wouter-preact";

import { CoreViewState } from "@client/state/AppState";
import { GearIcon } from "../ui/icons/GearIcon";
import { MagnifyingGlassIcon } from "../ui/icons/MagnifyingGlassIcon";
import { MusicalNoteIcon } from "../ui/icons/MusicalNoteIcon";
import { useAppState, useLongPress } from "@hooks/index";

export const ToolbarBottom = () => {
  const { view } = useAppState();
  const [, navigate] = useLocation();

  const onPress = useLongPress(
    () => {
      setViewState(CoreViewState.Library)();
      navigate("/library");
    },
    1000,
    { mouse: true, touch: true },
    true,
  );

  const setViewState = (state: CoreViewState) => () => {
    view.value = state;
  };

  return (
    <div id="toolbar-bottom">
      <div
        className={
          "action" + (view.value === CoreViewState.Library ? " active" : "")
        }
        onClick={setViewState(CoreViewState.Library)}
        {...onPress.events}
      >
        <MusicalNoteIcon className="icon-sm" />
      </div>

      <div
        className={
          "action" + (view.value === CoreViewState.Search ? " active" : "")
        }
        onClick={setViewState(CoreViewState.Search)}
      >
        <MagnifyingGlassIcon className="icon-sm" />
      </div>

      <div
        className={
          "action" + (view.value === CoreViewState.Settings ? " active" : "")
        }
        onClick={setViewState(CoreViewState.Settings)}
      >
        <GearIcon className="icon-sm" />
      </div>
    </div>
  );
};
