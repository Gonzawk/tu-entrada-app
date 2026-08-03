import { UserRole } from "./auth";

export interface AdminUsuario {
  id: number;
  email: string;
  nombreCompleto: string;
  telefono?: string | null;
  activo: boolean;
  emailVerificado: boolean;
  fechaCreacion: string;
  roles: UserRole[];
}

export interface AdminCrearUsuarioRequest {
  nombreCompleto: string;
  email: string;
  telefono?: string | null;
  password: string;
  roles: UserRole[];
}

export interface CambiarEstadoUsuarioRequest {
  activo: boolean;
}

export interface CambiarVerificacionEmailRequest {
  emailVerificado: boolean;
}

export interface CrearUsuarioVentanillaRequest {
  nombreCompleto: string;
  email: string;
  telefono?: string | null;
  password: string;
}