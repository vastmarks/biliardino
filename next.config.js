// Validates env vars at build/start time
require("./src/server/env");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: { NEXT_PUBLIC_APP_VERSION: require("./package.json").version },
  output: "standalone",
  // native module, must not be bundled
  serverExternalPackages: ["better-sqlite3"],
  // the old Leaderboards page became the Hall of Fame (0.9.0); keep old bookmarks working
  async redirects() {
    return [
      {
        source: "/leaderboards",
        destination: "/hall-of-fame",
        permanent: true,
      },
    ];
  },
  // The native SQLite module is loaded dynamically at runtime and can't be found by file
  // tracing, so ship it explicitly. (Prisma 7 bundles its query compiler into the app.)
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/better-sqlite3/package.json",
      "./node_modules/better-sqlite3/lib/**/*",
      "./node_modules/better-sqlite3/build/Release/*.node",
      "./node_modules/bindings/**/*",
      "./node_modules/file-uri-to-path/**/*",
    ],
  },
};

module.exports = nextConfig;
