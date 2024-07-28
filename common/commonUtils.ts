/**
 * Extract the file type from a file's path
 *
 * @param file_path - file's path
 * @returns file type
 */
export const getFileTypeFromPath = (file_path: string) =>
  file_path.match(/\.(\w+)$/)?.[1]?.toUpperCase();

type TruncateOptions = {
  length?: number;
  omission?: string;
};

/**
 * Truncates `value` if it exceeds the given `length`
 *
 * @param value - The string to truncate
 * @param options - The options to configure the truncation
 * @returns The truncated string with the omission string appended if necessary.
 */
export const truncate = (
  value: string,
  options: TruncateOptions = {},
): string => {
  const { length = 30, omission = "..." } = options;

  // If the string is already shorter than or equal to the max length, return it
  if (value.length <= length) {
    return value;
  }

  // Calculate the length of the truncated string without the omission string
  const truncated_length = length - omission.length;

  // Ensure the truncated length is non-negative
  if (truncated_length <= 0) {
    return omission;
  }

  // Truncate the string
  const truncatedString = value.slice(0, truncated_length);

  // Return the truncated string with the omission string appended
  return truncatedString + omission;
};

/**
 * Capitalizes the first character of the given string and lowercases the rest
 *
 * @param value - The string to capitalize
 * @returns A new string with the first character capitalized
 */
export const capitalize = (value: string): string => {
  // If the string is empty, return it as is
  if (!value) {
    return value;
  }

  // Capitalize the first character and lowercase the rest
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

export const uniqueId = (() => {
  let uniqueIdCounter = 0;

  /**
   * Generates a unique ID with an optional prefix
   *
   * If a prefix is provided, the ID will be prefixed with that string followed by
   * an incrementing number.
   *
   * @param prefix - An optional string to prefix the ID
   * @returns A unique string ID, potentially prefixed
   */
  return function uniqueId(prefix = ""): string {
    uniqueIdCounter += 1;
    return `${prefix}${uniqueIdCounter}`;
  };
})();

/**
 * Returns the index of the first element in an array that satisfies the
 * provided testing function
 *
 * If no element is found, it returns -1
 *
 * @param array - The array to search through
 * @param predicate - The function to test each element
 * @returns The index of the first element that satisfies the predicate function
 */
export const findIndex = <T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => boolean,
): number => {
  for (let i = 0; i < array.length; i++) {
    if (predicate(array[i], i, array)) {
      return i;
    }
  }
  return -1;
};

/**
 * Randomly shuffles the elements of an array and returns a new shuffled array
 *
 * @param array - The array to shuffle
 * @returns A new array with the elements shuffled in random order
 */
export const shuffle = <T>(array: T[]): T[] => {
  const shuffled = array.slice(); // Create a shallow copy of the array
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // Swap elements
  }
  return shuffled;
};

/**
 * Checks if the provided value is of type string
 *
 * @param value - The value to check
 * @returns `true` if the value is a string, otherwise `false`
 */
export const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

/**
 * Returns a new array with all duplicate elements removed from the given array
 *
 * @param array - The array to remove duplicates from
 * @returns A new array with unique element
 */
export const uniq = <T>(array: T[]): T[] => {
  return Array.from(new Set(array));
};
