import { PagedResponse } from "../types/common";
import { MiTicket, TicketPendienteReclamar } from "../types/tickets";
import { apiClient } from "./apiClient";

export async function getMisTicketsPaginadosApi(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PagedResponse<MiTicket>> {
  const response = await apiClient.get<PagedResponse<MiTicket>>(
    "/api/tickets/mis-tickets",
    {
      params: {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 5,
        search: params?.search ?? "",
      },
    }
  );

  return response.data;
}

export async function getMiTicketDetalleApi(
  ticketId: number
): Promise<MiTicket> {
  const response = await apiClient.get<MiTicket>(
    `/api/tickets/mis-tickets/${ticketId}`
  );

  return response.data;
}
export async function getTicketsPendientesReclamarApi(): Promise<
  TicketPendienteReclamar[]
> {
  const response = await apiClient.get<TicketPendienteReclamar[]>(
    "/api/tickets/pendientes-reclamar"
  );

  return response.data;
}

export async function getTicketsPendientesDeMiCompraApi(): Promise<
  TicketPendienteReclamar[]
> {
  const response = await apiClient.get<TicketPendienteReclamar[]>(
    "/api/tickets/pendientes-de-mi-compra"
  );

  return response.data;
}

export async function reclamarTicketApi(ticketId: number) {
  const response = await apiClient.put(`/api/tickets/${ticketId}/reclamar`);
  return response.data;
}

export async function reclamarTicketPorCodigoApi(codigoReclamo: string) {
  const response = await apiClient.put("/api/tickets/reclamar-por-codigo", {
    codigoReclamo,
  });

  return response.data;
}

export async function asignarTicketPendienteApi(
  ticketId: number,
  data: {
    usuarioAsignadoId?: number | null;
    email?: string | null;
    nombrePendiente?: string | null;
  }
) {
  const response = await apiClient.put(`/api/tickets/${ticketId}/asignar`, data);
  return response.data;
}


export async function transferirTicketApi(
  ticketId: number,
  data: {
    emailNuevoDueno: string;
    nombreNuevoDueno?: string | null;
    idempotencyKey?: string | null;
  }
): Promise<{
  message: string;
  ticketId: number;
  estado: string;
  quedoPendiente: boolean;
  emailPendiente?: string | null;
  codigoReclamo?: string | null;
}> {
  const response = await apiClient.post(
    `/api/tickets/${ticketId}/transferir`,
    data
  );

  return response.data;
}