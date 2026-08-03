import {
  AdminEstadisticaEventoDetalle,
  AdminEstadisticasResumen,
  AdminEventoCargosResumen,
} from "../types/adminStats";
import { apiClient } from "./apiClient";

export async function getAdminStatsResumenApi(params?: {
  desde?: string | null;
  hasta?: string | null;
  eventoId?: number | null;
}): Promise<AdminEstadisticasResumen> {
  const response = await apiClient.get<AdminEstadisticasResumen>(
    "/api/admin/estadisticas/resumen",
    {
      params: {
        desde: params?.desde ?? undefined,
        hasta: params?.hasta ?? undefined,
        eventoId: params?.eventoId ?? undefined,
      },
    }
  );

  return response.data;
}

export async function getAdminStatsEventosApi(params?: {
  page?: number;
  pageSize?: number;
  desde?: string | null;
  hasta?: string | null;
  eventoId?: number | null;
}) {
  const response = await apiClient.get("/api/admin/estadisticas/eventos", {
    params: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 5,
      desde: params?.desde ?? undefined,
      hasta: params?.hasta ?? undefined,
      eventoId: params?.eventoId ?? undefined,
    },
  });

  return response.data;
}

export async function getAdminStatsEventoDetalleApi(
  eventoId: number,
  params?: {
    desde?: string | null;
    hasta?: string | null;
  }
): Promise<AdminEstadisticaEventoDetalle> {
  const response = await apiClient.get<AdminEstadisticaEventoDetalle>(
    `/api/admin/estadisticas/eventos/${eventoId}/detalle`,
    {
      params: {
        desde: params?.desde ?? undefined,
        hasta: params?.hasta ?? undefined,
      },
    }
  );

  return response.data;
}

export async function getAdminEventoCargosResumenApi(
  eventoId: number
): Promise<AdminEventoCargosResumen> {
  const response = await apiClient.get<AdminEventoCargosResumen>(
    `/api/admin/estadisticas/eventos/${eventoId}/cargos-servicio`
  );

  return response.data;
} 