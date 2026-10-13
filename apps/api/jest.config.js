/** @type {import("jest").Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testMatch: ["**/*.spec.ts", "**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@word-map/shared/(.*)$": "<rootDir>/../../../packages/shared/src/$1",
    "^@word-map/shared$": "<rootDir>/../../../packages/shared/src/index.ts",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { diagnostics: false }],
  },
  setupFiles: ["<rootDir>/test/setup.ts"],
};
