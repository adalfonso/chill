import { useContext, useState, useEffect, useCallback } from "preact/hooks";

import { AppContext } from "@client/state/AppState";

type UseInfiniteScrollOptions<T> = {
  onScroll: (page: number) => Promise<T[]>;
  observedElement: React.RefObject<Element>;
  dependencies?: unknown[];
  options: ScrollOptions;
};

type ScrollOptions = {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
};

type UseInfiniteScrollResult<T> = {
  has_more: boolean;
  page: number;
  items: Array<T>;
};

export const useInfiniteScroll = <T>(
  args: UseInfiniteScrollOptions<T>,
): UseInfiniteScrollResult<T> => {
  const { onScroll, observedElement, dependencies = [], options } = args;
  const { is_busy } = useContext(AppContext);

  const [has_more, setHasMore] = useState(true);
  const [items, setItems] = useState<Array<T>>([]);
  const [page, setPage] = useState(0);

  const fetchMoreData = useCallback(
    async (page: number) => {
      is_busy.value = true;

      try {
        const items = await onScroll(page);

        if (items.length === 0) {
          setHasMore(false);
        } else {
          setItems((prev) => (page === 0 ? items : [...prev, ...items]));
          setPage((prev) => prev + 1);
        }
      } catch (error) {
        setHasMore(false);
        console.error("Error fetching data:", error);
      } finally {
        is_busy.value = false;
      }
    },
    [onScroll, page],
  );

  useEffect(() => {
    setPage(0);
    setItems([]);
    setHasMore(true);
    is_busy.value = false;
    fetchMoreData(0);
  }, [...dependencies]);

  useEffect(() => {
    if (is_busy.value || !has_more) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchMoreData(page);
      }
    }, options);

    if (observedElement.current) {
      observer.observe(observedElement.current);
    }

    return () => {
      if (observedElement.current) {
        observer.unobserve(observedElement.current);
      }
    };
  }, [observedElement, fetchMoreData, has_more, is_busy.value, options]);

  return { has_more, page, items };
};
