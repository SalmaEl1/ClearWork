import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    // Los tests comparten una única base de datos real (clearwork_test);
    // ejecutarlos en serie evita que se pisen entre sí (p. ej. el test de
    // concurrencia de membresías con los de autoprotección del admin).
    fileParallelism: false,
    hookTimeout: 20_000,
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**"],
    },
  },
});
