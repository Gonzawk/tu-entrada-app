import { PagedResponse } from "../types/common";
import { EventoReprogramacion, ReprogramarEventoRequest } from "../types/eventoAuditoria";
import { apiClient } from "./apiClient";



export async function reprogramarEventoAdminApi(
  eventoId: number,
  data: ReprogramarEventoRequest
) {
  const response = await apiClient.put(
    `/api/admin/eventos/${eventoId}/reprogramar`,
    data
  );

  return response.data;
}

export async function getReprogramacionesEventoAdminApi(params: {
  eventoId: number;
  page?: number;
  pageSize?: number;
}): Promise<PagedResponse<EventoReprogramacion>> {
  const response = await apiClient.get(
    `/api/admin/eventos/${params.eventoId}/reprogramaciones`,
    {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      },
    }
  );

  return response.data;
}