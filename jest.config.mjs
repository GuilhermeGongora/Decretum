import nextJest from "next/jest.js";

// next/jest wires SWC transforms and loads .env files the same way Next.js does.
const createJestConfig = nextJest({ dir: "./" });

const shared = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

const unitConfig = createJestConfig({
  ...shared,
  displayName: "unit",
  testMatch: ["<rootDir>/tests/unit/**/*.test.js"],
});

// Integration tests migrate and seed the test database once before running.
const integrationConfig = createJestConfig({
  ...shared,
  displayName: "integration",
  testMatch: ["<rootDir>/tests/integration/**/*.test.js"],
  globalSetup: "<rootDir>/tests/integration/setup/globalSetup.mjs",
});

export default async function jestConfig() {
  return { projects: [await unitConfig(), await integrationConfig()] };
}
