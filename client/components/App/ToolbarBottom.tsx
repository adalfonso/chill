import "./ToolbarBottom.scss";

import { CoreViewState } from "@client/state/AppState";
import { GearIcon } from "../ui/icons/GearIcon";
import { MagnifyingGlassIcon } from "../ui/icons/MagnifyingGlassIcon";
import { MusicalNoteIcon } from "../ui/icons/MusicalNoteIcon";
import { useAppState } from "@hooks/index";

export const ToolbarBottom = () => {
  const { view } = useAppState();

  const setViewState = (state: CoreViewState) => () => {
    view.value = state;
  };

  return (
    <div id="toolbar-bottom">
      <div className="action" onClick={setViewState(CoreViewState.Library)}>
        <MusicalNoteIcon className="icon-sm" />
      </div>

      <div className="action" onClick={setViewState(CoreViewState.Search)}>
        <MagnifyingGlassIcon className="icon-sm" />
      </div>

      <div className="action" onClick={setViewState(CoreViewState.Settings)}>
        <GearIcon className="icon-sm" />
      </div>
    </div>
  );
};
