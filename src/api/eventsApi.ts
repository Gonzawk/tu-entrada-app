import { PagedResponse } from "../types/common";
import {
  EntradaDisponible,
  EventoActivo,
  EventoProximoBebidas,
  RRPPDisponible,
  TipoEntradaAdmin
} from "../types/events";
import { apiClient } from "./apiClient";

export async function getEventosActivosApi(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PagedResponse<EventoActivo>> {
  const response = await apiClient.get<PagedResponse<EventoActivo>>(
    "/api/eventos/activos",
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

export async function getEventoDetalleApi(eventoId: number): Promise<any> {
  const response = await apiClient.get(`/api/eventos/${eventoId}`);
  return response.data;
}

export async function getEventoDetalleAdminApi(eventoId: number) {
    const response = await apiClient.get(
        `/api/eventos/${eventoId}/detalle`
    );

    return response.data;
}

export async function getEntradasDisponiblesApi(
  eventoId: number
): Promise<EntradaDisponible[]> {
  const response = await apiClient.get<EntradaDisponible[]>(
    `/api/eventos/${eventoId}/entradas-disponibles`
  );

  return response.data;
}

export async function getRRPPsDisponiblesEventoApi(params: {
  eventoId: number;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PagedResponse<RRPPDisponible>> {
  const response = await apiClient.get<PagedResponse<RRPPDisponible>>(
    `/api/eventos/${params.eventoId}/rrpps-disponibles`,
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


export async function getTiposEntradaPorEventoAdminApi(
  eventoId: number
): Promise<TipoEntradaAdmin[]> {
  const response = await apiClient.get<TipoEntradaAdmin[]>(
    `/api/eventos/${eventoId}/tipos-entrada`
  );

  return response.data;
}


export async function getProximoEventoParaBebidasApi(): Promise<EventoProximoBebidas> {
  const response = await apiClient.get("/api/eventos/proximo-para-bebidas");
  return response.data;
}