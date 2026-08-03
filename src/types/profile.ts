/**
 * Respuesta del endpoint:
 * GET /api/usuarios/me
 */
export interface MyProfileResponse {
  id: number;
  nombreCompleto: string;
  email: string;
  telefono: string;
  fotoUrl: string | null;
  emailVerificado: boolean;
  fechaCreacion: string;
  roles: string[];
}

/**
 * Payload requerido por:
 * POST /api/account-deletion/request
 */
export interface RequestAccountDeletionRequest {
  passwordActual: string;
  motivo?: string;
  confirmacion: "ELIMINAR";
}

/**
 * Respuesta de:
 * POST /api/account-deletion/request
 */
export interface RequestAccountDeletionResponse {
  exitoso: boolean;
  solicitudId: number;
  estado: AccountDeletionStatusName;
  message: string;
}

/**
 * Estados esperados para una solicitud de eliminación.
 *
 * Se deja también la posibilidad de recibir otros valores desde backend,
 * para evitar romper el frontend si en el futuro se agrega un nuevo estado.
 */
export type AccountDeletionStatusName =
  | "PendienteConfirmacion"
  | "Confirmada"
  | "EnRevision"
  | "Aprobada"
  | "Rechazada"
  | "Procesada"
  | "Cancelada"
  | "Expirada"
  | (string & {});

/**
 * Respuesta opcional de:
 * GET /api/account-deletion/status
 *
 * Este tipo queda listo para usar si tu backend ya expone el estado
 * de la solicitud activa.
 */
export interface AccountDeletionStatusResponse {
  tieneSolicitudActiva: boolean;
  solicitudId: number | null;
  estado: number | string | null;
  estadoTexto: AccountDeletionStatusName | null;
  fechaSolicitud: string | null;
  fechaConfirmacion: string | null;
  fechaExpiracionToken: string | null;
  fechaProcesamiento: string | null;
  motivo: string | null;
  message: string;
}

/**
 * Datos internos del formulario del modal de eliminación.
 */
export interface DeleteAccountFormValues {
  passwordActual: string;
  motivo: string;
  confirmacion: string;
}

/**
 * Estado de validación del formulario.
 */
export interface DeleteAccountFormErrors {
  passwordActual?: string;
  confirmacion?: string;
  general?: string;
}