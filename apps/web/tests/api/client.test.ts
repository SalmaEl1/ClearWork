import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiFetch,
  apiFetchFormData,
  downloadFile,
  getStoredToken,
  setStoredToken,
} from "../../src/api/client.js";

/** Respuesta mínima con la forma que espera client.ts (ok/status/json/blob). */
function response(body: unknown, { ok = true, status = 200 }: { ok?: boolean; status?: number } = {}) {
  return {
    ok,
    status,
    json: async () => body,
    blob: async () => new Blob([JSON.stringify(body)]),
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("token en localStorage", () => {
  it("guarda, lee y borra el token", () => {
    expect(getStoredToken()).toBeNull();
    setStoredToken("abc");
    expect(getStoredToken()).toBe("abc");
    setStoredToken(null);
    expect(getStoredToken()).toBeNull();
  });
});

describe("apiFetch", () => {
  it("hace un GET a la URL base y devuelve el JSON", async () => {
    fetchMock.mockResolvedValue(response([{ id: "1" }]));
    const data = await apiFetch<{ id: string }[]>("/things");

    expect(data).toEqual([{ id: "1" }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:4000/api/things");
    expect(init.method).toBe("GET");
    expect(init.headers).not.toHaveProperty("Authorization");
  });

  it("añade la cabecera Authorization cuando hay token y serializa el body", async () => {
    setStoredToken("tok-123");
    fetchMock.mockResolvedValue(response({ ok: true }));

    await apiFetch("/things", { method: "POST", body: { name: "x" } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer tok-123");
    expect(init.body).toBe(JSON.stringify({ name: "x" }));
  });

  it("devuelve undefined ante un 204 sin tocar el cuerpo", async () => {
    const json = vi.fn();
    fetchMock.mockResolvedValue({ ok: true, status: 204, json });

    await expect(apiFetch("/things/1", { method: "DELETE" })).resolves.toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it("lanza ApiError con el mensaje del backend cuando la respuesta no es ok", async () => {
    fetchMock.mockResolvedValue(response({ error: "No permitido" }, { ok: false, status: 403 }));

    await expect(apiFetch("/things")).rejects.toMatchObject({
      name: "ApiError",
      message: "No permitido",
      status: 403,
    });
  });

  it("usa un mensaje genérico si el backend no manda 'error'", async () => {
    fetchMock.mockResolvedValue(response({}, { ok: false, status: 500 }));
    await expect(apiFetch("/things")).rejects.toThrow("Error inesperado");
  });
});

describe("apiFetchFormData", () => {
  it("manda el FormData tal cual, sin fijar Content-Type", async () => {
    setStoredToken("tok");
    fetchMock.mockResolvedValue(response({ id: "doc-1" }));
    const fd = new FormData();
    fd.append("label", "Nómina");

    const data = await apiFetchFormData<{ id: string }>("/documents", fd);

    expect(data).toEqual({ id: "doc-1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:4000/api/documents");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(fd);
    expect(init.headers).not.toHaveProperty("Content-Type");
    expect(init.headers.Authorization).toBe("Bearer tok");
  });

  it("lanza ApiError cuando la subida falla", async () => {
    fetchMock.mockResolvedValue(response({ error: "Archivo demasiado grande" }, { ok: false, status: 413 }));
    await expect(apiFetchFormData("/documents", new FormData())).rejects.toThrow("Archivo demasiado grande");
  });
});

describe("downloadFile", () => {
  it("descarga el blob y dispara un enlace temporal", async () => {
    fetchMock.mockResolvedValue(response("col1,col2", { ok: true, status: 200 }));
    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const click = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({ href: "", download: "", click } as unknown as HTMLAnchorElement);

    await downloadFile("/admin/users/export", "usuarios.csv");

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("lanza ApiError si la descarga responde con error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "No existe" }),
    });
    await expect(downloadFile("/x", "x.csv")).rejects.toThrow("No existe");
  });

  it("ApiError es una instancia de Error con nombre propio", () => {
    const err = new ApiError("x", 400);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
  });
});
