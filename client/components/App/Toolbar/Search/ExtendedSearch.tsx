import { useEffect } from "preact/hooks";
import { useLocation } from "wouter-preact";
import { useSignal } from "@preact/signals";

import { ChevronLeftIcon } from "@client/components/ui/icons/ChevronLeftIcon";
import { CoreViewState } from "@client/state/AppState";
import { SearchResult, SearchResultType } from "@common/types";
import { SearchResultRow } from "./SearchResultRow";
import { api } from "@client/client";
import { useAppState, useBackNavigate } from "@hooks/index";

type ExtendedSearchProps = {
  type: SearchResultType;
  term: string;
  onClose: () => void;
};

export const ExtendedSearch = ({
  type,
  term,
  onClose,
}: ExtendedSearchProps) => {
  const { view } = useAppState();
  const results = useSignal<Array<SearchResult>>([]);
  const [, navigate] = useLocation();

  // Let backNavigate call onClose when navigating back
  const localClose = () => {
    window.history.back();
  };

  useBackNavigate(
    () => true,
    () => onClose(),
  );

  useEffect(() => {
    api.media.search
      .query({
        query: term,
        limit: 50,
        types: [type],
      })
      .then((data) => {
        results.value = data;
      })
      .catch((err) => {
        console.error(`ExtendedSearch Failed:`, (err as Error).message);
      });
  }, [type, term]);

  // Visit page for search result
  const visitMedia = async (file: SearchResult) => {
    const { path } = file;

    view.value = CoreViewState.Library;

    navigate("/library" + path);
  };

  return (
    <div className="search">
      <ChevronLeftIcon onClick={localClose} className="icon-xs" />

      {results.value.length > 0 && (
        <div className="search-results">
          <h4>{type.toUpperCase()}</h4>
          {results.value.map((result) => {
            return (
              <SearchResultRow
                result={result}
                onVisit={visitMedia}
                key={result.displayAs.join("|") + result.value}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
