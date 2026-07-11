import { parseRange } from "../server/lib/io/stream";

describe("parseRange", () => {
  const SIZE = 1000;

  describe("valid ranges", () => {
    it.each([
      // [header, expected]
      ["bytes=0-99", { start: 0, end: 99 }],
      ["bytes=0-0", { start: 0, end: 0 }],
      ["bytes=200-799", { start: 200, end: 799 }],
      // Open-ended: to the last byte
      ["bytes=500-", { start: 500, end: 999 }],
      ["bytes=0-", { start: 0, end: 999 }],
      // Suffix: the final N bytes
      ["bytes=-200", { start: 800, end: 999 }],
      ["bytes=-1", { start: 999, end: 999 }],
      // Suffix larger than the file clamps to the whole file
      ["bytes=-5000", { start: 0, end: 999 }],
      // End past EOF clamps to the last byte
      ["bytes=0-100000", { start: 0, end: 999 }],
      // Whitespace is tolerated
      [" bytes=10-19 ", { start: 10, end: 19 }],
    ])("%s -> %o", (header, expected) => {
      expect(parseRange(header, SIZE)).toEqual(expected);
    });
  });

  describe("unsatisfiable / malformed -> null", () => {
    it.each([
      ["bytes=1000-1100"], // start at/after EOF
      ["bytes=1500-"], // open-ended start past EOF
      ["bytes=500-100"], // start after end
      ["bytes=-0"], // zero-length suffix
      ["bytes=-"], // no bounds at all
      ["bytes=abc-def"], // non-numeric
      ["bytes=0-99,200-299"], // multi-range not supported
      ["items=0-99"], // wrong unit
      ["0-99"], // missing unit prefix
      [""], // empty
    ])("%s -> null", (header) => {
      expect(parseRange(header, SIZE)).toBeNull();
    });
  });

  it("resolves the last single byte for a zero-indexed suffix boundary", () => {
    expect(parseRange("bytes=-1000", SIZE)).toEqual({ start: 0, end: 999 });
  });
});
