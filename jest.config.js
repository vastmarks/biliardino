/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: "node",
  transform: {
    // our TypeScript, plus the few ESM-only packages below (they ship modern JS)
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      { tsconfig: { allowJs: true, jsx: "react-jsx" }, isolatedModules: true },
    ],
  },
  transformIgnorePatterns: ["/node_modules/(?!(superjson|copy-anything|is-what)/)"],
  moduleNameMapper: {
    "~/(.*)": "<rootDir>/src/$1",
  },
  // the standalone build contains a copy of package.json
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  verbose: true,
};
