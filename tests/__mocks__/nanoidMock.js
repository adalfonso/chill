// nanoid@5 ships ESM-only, which Jest's CJS runtime can't load directly.
// None of the auth logic under test depends on nanoid's actual randomness
// (it only generates low-entropy device-session ids elsewhere), so tests
// redirect here via moduleNameMapper instead of transforming the real ESM
// package.
let counter = 0;

module.exports = {
  nanoid: (size = 21) => `test-nanoid-${++counter}`.padEnd(size, "0"),
};
