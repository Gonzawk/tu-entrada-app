import { apiClient } from "../api/apiClient"; // Ajustar si tu instancia Axios está en otra ruta

import type {
    AccountDeletionStatusResponse,
    MyProfileResponse,
    RequestAccountDeletionRequest,
    RequestAccountDeletionResponse,
} from "../types/profile";

const PROFILE_BASE = "/api/usuarios";
const ACCOUNT_DELETION_BASE = "/api/account-deletion";

/**
 * Obtiene el perfil del usuario autenticado.
 */
export async function getMyProfile(): Promise<MyProfileResponse> {
  const { data } = await apiClient  .get<MyProfileResponse>(
    `${PROFILE_BASE}/me`
  );

  return data;
}

/**
 * Obtiene el estado actual de la solicitud de eliminación.
 * Si todavía no implementaste este endpoint simplemente
 * no invoques esta función por el momento.
 */
export async function getAccountDeletionStatus(): Promise<AccountDeletionStatusResponse> {
  const { data } =
    await apiClient.get<AccountDeletionStatusResponse>(
      `${ACCOUNT_DELETION_BASE}/status`
    );

  return data;
}

/**
 * Envía la solicitud autenticada de eliminación.
 */
export async function requestAccountDeletion(
  request: RequestAccountDeletionRequest
): Promise<RequestAccountDeletionResponse> {
  const payload: RequestAccountDeletionRequest = {
    passwordActual: request.passwordActual.trim(),
    motivo: request.motivo?.trim() || undefined,
    confirmacion: "ELIMINAR",
  };

  const { data } =
    await apiClient .post<RequestAccountDeletionResponse>(
      `${ACCOUNT_DELETION_BASE}/request`,
      payload
    );

  return data;
}

/**
 * Futuro endpoint para cancelar una solicitud.
 */
export async function cancelAccountDeletion(): Promise<void> {
  await apiClient.post(`${ACCOUNT_DELETION_BASE}/cancel`);
}