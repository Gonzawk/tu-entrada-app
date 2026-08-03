import { DoorNextEvent, DoorProfile, DoorScanResponse, MarcarBebidaResponse } from "../types/door";
import { apiClient } from "./apiClient";



export async function escanearTicketPuertaApi(data: {
  codigoQR: string;
  idempotencyKey?: string | null;
}): Promise<DoorScanResponse> {
  const response = await apiClient.post<DoorScanResponse>(
    "/api/puerta/escanear",
    data
  );

  return response.data;
}
export async function marcarBebidaEntregadaApi(
  ticketId: number
): Promise<MarcarBebidaResponse> {
  const response = await apiClient.put<MarcarBebidaResponse>(
    `/api/puerta/tickets/${ticketId}/bebida-entregada`
  );

  return response.data;
}

export async function getMiPerfilPuertaApi(): Promise<DoorProfile> {
  const response = await apiClient.get<DoorProfile>("/api/puerta/mi-perfil");
  return response.data;
}

export async function getEventoProximoPuertaApi(): Promise<DoorNextEvent | null> {
  const response = await apiClient.get<DoorNextEvent | null>(
    "/api/puerta/evento-proximo"
  );

  return response.data;
}