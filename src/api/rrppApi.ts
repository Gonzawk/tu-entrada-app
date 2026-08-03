import { PagedResponse } from "../types/common";
import { RRPPEventoResumen, RRPPOrdenConfirmada, RRPPOrdenEvento, RRPPOrdenPendiente, RRPPPerfil } from "../types/rrpp";
import { apiClient } from "./apiClient";

export async function getOrdenesPendientesRRPPApi(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PagedResponse<RRPPOrdenPendiente>> {
  const response = await apiClient.get<PagedResponse<RRPPOrdenPendiente>>(
    "/api/rrpp/ordenes-pendientes",
    {
      params: {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 10,
        search: params?.search ?? "",
      },
    }
  );

  return response.data;
}

export async function confirmarOrdenRRPPApi(ordenId: number) {
  const response = await apiClient.put(`/api/ordenes/${ordenId}/confirmar`);
  return response.data;
}

export async function getOrdenesConfirmadasRRPPApi(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PagedResponse<RRPPOrdenConfirmada>> {
  const response =
    await apiClient.get<PagedResponse<RRPPOrdenConfirmada>>(
      "/api/rrpp/ordenes-confirmadas",
      {
        params: {
          page: params?.page ?? 1,
          pageSize: params?.pageSize ?? 10,
          search: params?.search ?? "",
        },
      }
    );

  return response.data;
}

export async function getOrdenConfirmadaDetalleRRPPApi(ordenId: number) {
  const response = await apiClient.get(
    `/api/rrpp/ordenes-confirmadas/${ordenId}`
  );

  return response.data;
}

export async function getMiPerfilRRPPApi(): Promise<RRPPPerfil> {
  const response = await apiClient.get<RRPPPerfil>("/api/rrpp/mi-perfil");
  return response.data;
}

export async function getMisEventosRRPPPaginadosApi(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PagedResponse<RRPPEventoResumen>> {
  const response = await apiClient.get<PagedResponse<RRPPEventoResumen>>(
    "/api/eventos/rrpp/mis-eventos",
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

export async function getMiEventoDetalleRRPPApi(
  eventoId: number
): Promise<RRPPEventoResumen> {
  const response = await apiClient.get<RRPPEventoResumen>(
    `/api/eventos/rrpp/mis-eventos/${eventoId}`
  );

  return response.data;
}

export async function getOrdenPendienteDetalleRRPPApi(
  ordenId: number
): Promise<RRPPOrdenPendiente> {
  const response = await apiClient.get(
    `/api/rrpp/ordenes-pendientes/${ordenId}`
  );

  return response.data;
}



export async function getHistorialEventoRRPPApi(params: {
  eventoId: number;
  page?: number;
  pageSize?: number;
  search?: string;
  estado?: string | null;
}): Promise<PagedResponse<RRPPOrdenEvento>> {
  const response = await apiClient.get(
    `/api/rrpp/eventos/${params.eventoId}/historial`,
    {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        search: params.search ?? "",
        estado: params.estado ?? undefined,
      },
    }
  );

  return response.data;
}

export async function getOrdenesConfirmadasRRPPPorEventoApi(params: {
  eventoId: number;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PagedResponse<RRPPOrdenEvento>> {
  const response = await apiClient.get(
    `/api/rrpp/eventos/${params.eventoId}/ordenes-confirmadas`,
    {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        search: params.search ?? "",
      },
    }
  );

  return response.data;
}

export async function cancelarOrdenRRPPApi(ordenId: number) {
  const response = await apiClient.put(`/api/ordenes/ordenes/${ordenId}/cancelar`);
  return response.data;
}