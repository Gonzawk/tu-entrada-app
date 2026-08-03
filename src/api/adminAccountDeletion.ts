
import { apiClient } from "../api/apiClient";

import type {
    AccountDeletionActionResponse,
    AccountDeletionAdminResponse,
    ResolveAccountDeletionRequest,
} from "../types/adminAccountDeletion";

const BASE="/api/account-deletion/admin";

/**
 * Obtiene las solicitudes pendientes de gestión.
 */
export async function getPendingAccountDeletionRequests():
Promise<AccountDeletionAdminResponse[]>{

  const {data}=await apiClient.get<AccountDeletionAdminResponse[]>(
    `${BASE}/pending`
  );

  return data;
}

/**
 * Cambia una solicitud Confirmada -> EnRevision
 */
export async function startAccountDeletionReview(
  solicitudId:number
):Promise<AccountDeletionActionResponse>{

  const {data}=await apiClient.post<AccountDeletionActionResponse>(
    `${BASE}/${solicitudId}/start-review`
  );

  return data;
}

/**
 * Aprueba o rechaza una solicitud.
 */
export async function resolveAccountDeletionRequest(
  solicitudId:number,
  request:ResolveAccountDeletionRequest
):Promise<AccountDeletionActionResponse>{

  const {data}=await apiClient.put<AccountDeletionActionResponse>(
    `${BASE}/${solicitudId}/resolve`,
    request
  );

  return data;
}

/**
 * Procesa definitivamente una solicitud aprobada.
 * Solo SuperAdmin.
 */
export async function processAccountDeletionRequest(
  solicitudId:number
):Promise<AccountDeletionActionResponse>{

  const {data}=await apiClient.post<AccountDeletionActionResponse>(
    `${BASE}/${solicitudId}/process`
  );

  return data;
}

/**
 * Helpers
 */

export async function approveAccountDeletionRequest(
  solicitudId:number,
  observacion?:string
){
  return resolveAccountDeletionRequest(solicitudId,{
    aprobar:true,
    observacion
  });
}

export async function rejectAccountDeletionRequest(
  solicitudId:number,
  observacion?:string
){
  return resolveAccountDeletionRequest(solicitudId,{
    aprobar:false,
    observacion
  });
}