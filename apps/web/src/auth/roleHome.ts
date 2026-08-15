import type { Role } from "@clearwork/shared";

export function roleHome(role: Role): string {
  switch (role) {
    case "worker":
      return "/worker";
    case "supervisor":
      return "/supervisor";
    case "admin":
      return "/admin";
  }
}
