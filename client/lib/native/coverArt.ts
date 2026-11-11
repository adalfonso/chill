/** Cover size sent to the car; small enough to cross the bridge cheaply */
const COVER_SIZE = 256;

/** How many covers to keep, so a long session cannot grow without bound */
const CACHE_LIMIT = 20;

/** Covers fetched successfully, keyed by filename, oldest first */
const covers = new Map<string, string>();

/** Fetches in progress, so one cover is never requested twice at once */
const loading = new Map<string, Promise<string | null>>();

/**
 * A cover that has already been loaded
 *
 * @param filename - the album art filename from the track metadata
 * @returns the cover as base64, or null when it has not been loaded
 */
export const cachedCover = (filename: string): string | null =>
  covers.get(filename) ?? null;

/**
 * Load a small cover for the car
 *
 * Android Auto fetches artwork without the login cookie, and the cover route
 * requires it. The WebView already holds the cookie, so it fetches the image and
 * hands the bytes to native. Concurrent loads of one cover share a single
 * request, a success is cached, and a failure is not, so the next call retries.
 *
 * @param filename - the album art filename from the track metadata
 * @returns the cover as base64, or null when it could not be fetched
 */
export const loadCover = (filename: string): Promise<string | null> => {
  const cached = cachedCover(filename);

  if (cached !== null) {
    return Promise.resolve(cached);
  }

  const pending =
    loading.get(filename) ??
    fetchCover(filename).finally(() => loading.delete(filename));

  loading.set(filename, pending);

  return pending;
};

/**
 * Fetch a cover and remember it
 *
 * @param filename - the album art filename
 * @returns the cover as base64, or null when the request failed
 */
const fetchCover = async (filename: string): Promise<string | null> => {
  try {
    const response = await fetch(
      `/api/v1/media/cover/${filename}?size=${COVER_SIZE}`,
    );

    if (!response.ok) {
      return null;
    }

    const cover = await toBase64(await response.blob());

    remember(filename, cover);

    return cover;
  } catch {
    return null;
  }
};

/**
 * Keep a cover, dropping the oldest one past the cache limit
 *
 * @param filename - the cover's filename
 * @param cover - its base64 data
 */
const remember = (filename: string, cover: string): void => {
  covers.set(filename, cover);

  if (covers.size > CACHE_LIMIT) {
    const [oldest] = covers.keys();

    covers.delete(oldest);
  }
};

/**
 * Convert a blob to a bare base64 string
 *
 * @param blob - the image data
 * @returns the base64 payload without the data-URL prefix
 */
const toBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
