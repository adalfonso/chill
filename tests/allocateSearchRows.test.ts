import { allocateSearchRows } from "../client/lib/allocateSearchRows";

describe("allocateSearchRows", () => {
  it("splits evenly when every group has plenty", () => {
    const rows = allocateSearchRows(
      new Map([
        ["a", 20],
        ["b", 20],
        ["c", 20],
      ]),
      12,
    );

    expect([...rows.values()]).toEqual([4, 4, 4]);
  });

  it("hands unused rows to larger groups", () => {
    const rows = allocateSearchRows(
      new Map([
        ["artist", 0],
        ["album", 13],
        ["track", 13],
      ]),
      12,
    );

    expect(rows.get("artist")).toBe(0);
    expect(rows.get("album")).toBe(6);
    expect(rows.get("track")).toBe(6);
  });

  it("never allocates more than a group has", () => {
    const rows = allocateSearchRows(
      new Map([
        ["a", 2],
        ["b", 13],
      ]),
      12,
    );

    expect(rows.get("a")).toBe(2);
    expect(rows.get("b")).toBe(10);
  });
});
