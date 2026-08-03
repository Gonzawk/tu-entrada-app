/**
 * Estados definidos por el backend en:
 * SolicitudEliminacionCuentaEstado
 */
export enum AccountDeletionRequestStatus {
  PendingConfirmation = 1,
  Confirmed = 2,
  UnderReview = 3,
  Approved = 4,
  Rejected = 5,
  CancelledByUser = 6,
  Processed = 7,
  Expired = 8,
}

/**
 * Valores textuales que devuelve actualmente el backend
 * en SolicitudEliminacionCuentaAdminResponse.Estado.
 */
export type AccountDeletionRequestStatusName =
  | "PendienteConfirmacion"
  | "Confirmada"
  | "EnRevision"
  | "Aprobada"
  | "Rechazada"
  | "CanceladaPorUsuario"
  | "Procesada"
  | "Expirada";

/**
 * DTO equivalente a:
 * SolicitudEliminacionCuentaAdminResponse
 */
export interface AccountDeletionAdminResponse {
  id: number;
  usuarioId: number;
  emailOriginal: string;
  nombreUsuario: string | null;
  estado: AccountDeletionRequestStatusName | string;
  motivo: string | null;
  fechaSolicitud: string;
  fechaConfirmacion: string | null;
  fechaInicioRevision: string | null;
  fechaResolucion: string | null;
  fechaProcesamiento: string | null;
  datosAnonimizados: boolean;
  observacionAdministrador: string | null;
}

/**
 * DTO equivalente a:
 * ResolverSolicitudEliminacionCuentaRequest
 */
export interface ResolveAccountDeletionRequest {
  aprobar: boolean;
  observacion?: string | null;
}

/**
 * Respuesta general utilizada por las acciones administrativas.
 *
 * Está alineada con SolicitudEliminacionCuentaResponse.
 */
export interface AccountDeletionActionResponse {
  exitoso: boolean;
  solicitudId: number | null;
  estado: string;
  message: string;
}

/**
 * Acción administrativa disponible sobre una solicitud.
 */
export type AccountDeletionAdminAction =
  | "start-review"
  | "approve"
  | "reject"
  | "process";

/**
 * Estado local de una acción individual del frontend.
 */
export interface AccountDeletionActionState {
  solicitudId: number | null;
  action: AccountDeletionAdminAction | null;
  loading: boolean;
}

/**
 * Filtros locales del listado.
 *
 * El endpoint actual devuelve las solicitudes pendientes de gestión.
 * Estos filtros se aplicarán inicialmente en el frontend.
 */
export interface AccountDeletionAdminFilters {
  search: string;
  status: AccountDeletionRequestStatusName | "Todas";
}

/**
 * Opción visual para filtros y badges.
 */
export interface AccountDeletionStatusOption {
  value: AccountDeletionRequestStatusName | "Todas";
  label: string;
}

/**
 * Estados que normalmente devuelve:
 * GET /api/account-deletion/admin/pending
 */
export const ACTIONABLE_ACCOUNT_DELETION_STATUSES: AccountDeletionRequestStatusName[] =
  ["Confirmada", "EnRevision", "Aprobada"];

/**
 * Todas las opciones conocidas por el frontend.
 */
export const ACCOUNT_DELETION_STATUS_OPTIONS: AccountDeletionStatusOption[] = [
  {
    value: "Todas",
    label: "Todas",
  },
  {
    value: "PendienteConfirmacion",
    label: "Pendiente de confirmación",
  },
  {
    value: "Confirmada",
    label: "Confirmada",
  },
  {
    value: "EnRevision",
    label: "En revisión",
  },
  {
    value: "Aprobada",
    label: "Aprobada",
  },
  {
    value: "Rechazada",
    label: "Rechazada",
  },
  {
    value: "CanceladaPorUsuario",
    label: "Cancelada por el usuario",
  },
  {
    value: "Procesada",
    label: "Procesada",
  },
  {
    value: "Expirada",
    label: "Expirada",
  },
];

/**
 * Convierte el valor textual del backend en un texto legible.
 */
export function getAccountDeletionStatusLabel(
  status: string
): string {
  switch (status) {
    case "PendienteConfirmacion":
      return "Pendiente de confirmación";

    case "Confirmada":
      return "Confirmada";

    case "EnRevision":
      return "En revisión";

    case "Aprobada":
      return "Aprobada";

    case "Rechazada":
      return "Rechazada";

    case "CanceladaPorUsuario":
      return "Cancelada por el usuario";

    case "Procesada":
      return "Procesada";

    case "Expirada":
      return "Expirada";

    default:
      return status || "Estado desconocido";
  }
}

/**
 * Type guard para comprobar si el estado recibido
 * pertenece al conjunto definido por el backend.
 */
export function isAccountDeletionRequestStatusName(
  value: string
): value is AccountDeletionRequestStatusName {
  return [
    "PendienteConfirmacion",
    "Confirmada",
    "EnRevision",
    "Aprobada",
    "Rechazada",
    "CanceladaPorUsuario",
    "Procesada",
    "Expirada",
  ].includes(value);
}

/**
 * Indica si la solicitud todavía requiere una acción administrativa.
 */
export function isActionableAccountDeletionStatus(
  status: string
): boolean {
  return ACTIONABLE_ACCOUNT_DELETION_STATUSES.includes(
    status as AccountDeletionRequestStatusName
  );
}

/**
 * Indica si un administrador puede iniciar la revisión.
 */
export function canStartAccountDeletionReview(
  status: string
): boolean {
  return status === "Confirmada";
}

/**
 * Indica si un administrador puede aprobar o rechazar.
 */
export function canResolveAccountDeletionRequest(
  status: string
): boolean {
  return status === "EnRevision";
}

/**
 * Indica si un SuperAdmin puede procesar definitivamente.
 */
export function canProcessAccountDeletionRequest(
  status: string
): boolean {
  return status === "Aprobada";
}