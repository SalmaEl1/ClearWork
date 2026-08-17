import type {
  AuthResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  MeResponse,
  ResetPasswordRequest,
  UpdateProfileRequest,
} from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function login(input: LoginRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", { method: "POST", body: input });
}

export function fetchCurrentUser(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/auth/me");
}

export function updateProfile(input: UpdateProfileRequest): Promise<MeResponse> {
  return apiFetch<MeResponse>("/auth/me", { method: "PATCH", body: input });
}

export function changePassword(input: ChangePasswordRequest): Promise<void> {
  return apiFetch<void>("/auth/password", { method: "PATCH", body: input });
}

export function forgotPassword(input: ForgotPasswordRequest): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/forgot-password", { method: "POST", body: input });
}

export function resetPassword(input: ResetPasswordRequest): Promise<void> {
  return apiFetch<void>("/auth/reset-password", { method: "POST", body: input });
}
