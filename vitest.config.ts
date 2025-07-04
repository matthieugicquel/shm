import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Don't include jest tests in tester-react-native
    include: ["src/**/*.test.ts"],
  },
});
