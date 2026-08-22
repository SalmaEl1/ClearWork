import { afterEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { generatePassword } from "../src/shared/password.js";

describe("generatePassword", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("genera la longitud solicitada y usa solo caracteres permitidos", () => {
    const password = generatePassword(24);
    expect(password).toHaveLength(24);
    expect(password).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789]+$/);
  });

  it("usa randomInt por carácter y no randomBytes", () => {
    const randomIntSpy = vi.spyOn(crypto, "randomInt").mockReturnValue(0);
    const randomBytesSpy = vi.spyOn(crypto, "randomBytes");

    const password = generatePassword(4);

    expect(password).toBe("AAAA");
    expect(randomIntSpy).toHaveBeenCalledTimes(4);
    expect(randomBytesSpy).not.toHaveBeenCalled();
  });
});
