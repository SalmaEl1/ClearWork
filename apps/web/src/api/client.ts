const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

const TOKEN_STORAGE_KEY = "clearwork.token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

/** Error de la API con el mensaje que ya viene traducido del backend. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getStoredToken();

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  // 204 No Content no tiene cuerpo que parsear.
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.error ?? "Error inesperado", response.status);
  }

  return data as T;
}

/**
 * Para respuestas que no son JSON (de momento, solo la exportación CSV):
 * pide el archivo con el mismo token que apiFetch, y dispara la descarga
 * en el navegador a través de un enlace temporal — es el mecanismo
 * estándar para forzar "guardar como" desde JavaScript, no hay una API
 * más directa para eso.
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = getStoredToken();

  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(data.error ?? "No se pudo descargar el archivo", response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
