export type UserRole = "SuperAdmin" | "Admin" | "RRPP" | "Puerta" | "Usuario" | "Barra" | "Ventanilla";

export interface AuthUser {
  userId: number;
  email: string;
  nombreCompleto: string;
  roles: UserRole[];
  token: string;

  /**
   * Fecha de expiración del JWT devuelta por el backend en UTC.
   * Ejemplo: 2026-07-18T08:30:00Z
   */
  expiresAtUtc: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nombreCompleto: string;
  telefono?: string;
  confirmaMayorDeEdad: true,
}

export interface RegisterResponse {
  message: string;
  requiereVerificacionEmail: boolean;
  email: string;
}