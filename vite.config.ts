/**
 * vite.config.ts
 *
 * Build- und Testkonfiguration für CrashStats CH.
 *
 * @author  Til Stegmüller, Leandro Fragale
 * @version 2.0
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
