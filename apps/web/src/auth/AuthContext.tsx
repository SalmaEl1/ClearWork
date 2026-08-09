import type { LoginRequest, PublicUser, RegisterRequest } from "@clearwork/shared";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { fetchCurrentUser, login as apiLogin, register as apiRegister } from "../api/auth.js";
import { getStoredToken, setStoredToken } from "../api/client.js";

type AuthContextValue = {
  user: PublicUser | null;
  /** Sigue en true mientras se comprueba si el token guardado sigue siendo válido. */
  isLoading: boolean;
  login: (input: LoginRequest) => Promise<void>;
  register: (input: RegisterRequest) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetchCurrentUser()
      .then(setUser)
      .catch(() => setStoredToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(input: LoginRequest) {
    const result = await apiLogin(input);
    setStoredToken(result.token);
    setUser(result.user);
  }

  async function register(input: RegisterRequest) {
    const result = await apiRegister(input);
    setStoredToken(result.token);
    setUser(result.user);
  }

  function logout() {
    setStoredToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
