import { AlertaUsoFraudulento } from "../types/alertasFraude";
import { PagedResponse } from "../types/common";
import { apiClient } from "./apiClient";


export async function getAlertasFraudeAdminApi(params?: {
  page?: number;
  pageSize?: number;
  revisada?: boolean | null;
  eventoId?: number | null;
}): Promise<PagedResponse<AlertaUsoFraudulento>> {
  const response = await apiClient.get("/api/admin/alertas-fraude", {
    params: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
      revisada: params?.revisada ?? undefined,
      eventoId: params?.eventoId ?? undefined,
    },
  });

  return response.data;
}

export async function marcarAlertaFraudeRevisadaAdminApi(alertaId: number) {
  const response = await apiClient.put(
    `/api/admin/alertas-fraude/${alertaId}/revisada`
  );

  return response.data;
}