import { UserRole } from "../types/auth";

export function getHomeByRole(role: UserRole): string {
  switch (role) {
    case "SuperAdmin":
    case "Admin":
      return "/admin/dashboard";

    case "Puerta":
      return "/door/dashboard";

    case "Barra":
      return "/barra/dashboard";

    case "RRPP":
      return "/rrpp/dashboard";

    case "Ventanilla":
      return "/ventanilla";

    case "Usuario":
    default:
      return "/user/events";
  }
}

export function getDefaultRole(roles: UserRole[]): UserRole {
  if (roles.includes("SuperAdmin")) return "SuperAdmin";
  if (roles.includes("Admin")) return "Admin";
  if (roles.includes("Puerta")) return "Puerta";
  if (roles.includes("Barra")) return "Barra";
  if (roles.includes("RRPP")) return "RRPP";
  if (roles.includes("Ventanilla")) return "Ventanilla";
  if (roles.includes("Usuario")) return "Usuario";

  /*
   * Evita guardar un rol inexistente si por alguna razón
   * el backend devuelve una colección vacía.
   */
  return roles[0] ?? "Usuario";
}