import {
    ActualizarEventoConfiguracionCompraRequest,
    EventoConfiguracionCompra,
} from "../types/eventPurchaseLimits";
import { apiClient } from "./apiClient";

export async function getEventoConfiguracionCompraAdminApi(
  eventoId: number
): Promise<EventoConfiguracionCompra> {
  const response = await apiClient.get<EventoConfiguracionCompra>(
    `/api/admin/eventos/${eventoId}/configuracion-compra`
  );

  return response.data;
}

export async function actualizarEventoConfiguracionCompraAdminApi(
  eventoId: number,
  data: ActualizarEventoConfiguracionCompraRequest
): Promise<EventoConfiguracionCompra> {
  const response = await apiClient.put<EventoConfiguracionCompra>(
    `/api/admin/eventos/${eventoId}/configuracion-compra`,
    data
  );

  return response.data;
}