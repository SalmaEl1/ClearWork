import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Sin `test.globals` en vitest.config.ts, @testing-library/react no detecta
// el test runner y no limpia el DOM sola entre tests: hay que pedírselo aquí.
afterEach(cleanup);
