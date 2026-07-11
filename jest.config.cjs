/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: ".",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/client/", "<rootDir>/server/", "<rootDir>/tests/"],
  setupFiles: ["<rootDir>/tests/__mocks__/shim.js"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  testRegex: "/tests/.*\\.(test|spec)\\.(ts|tsx)$",
  transformIgnorePatterns: ["/node_modules/"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { isolatedModules: true }],
  },
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/tests/__mocks__/fileMock.js",
    "\\.(css|scss|less)$": "<rootDir>/tests/__mocks__/styleMock.js",
    "@client(.*)$": "<rootDir>/client$1",
    "@server(.*)$": "<rootDir>/server$1",
    "@common(.*)$": "<rootDir>/common$1",
  },
  coverageDirectory: "<rootDir>/tests/__coverage__/",
  globals: {
    DEVELOPMENT: false,
    FAKE_SERVER: false,
  },
};
