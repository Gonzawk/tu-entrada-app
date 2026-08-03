import { PagedResponse } from "../types/common";
import { CrearOrdenRequest, MiOrdenDetalle, MiOrdenResumen, OrdenResponse } from "../types/orders";
import { apiClient } from "./apiClient";


export async function crearOrdenApi(
  data: CrearOrdenRequest
  
): Promise<OrdenResponse> {
  const response = await apiClient.post<OrdenResponse>("/api/ordenes", data);
  return response.data;
  
}

export async function getMisOrdenesPaginadasApi(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PagedResponse<MiOrdenResumen>> {
  const response = await apiClient.get<PagedResponse<MiOrdenResumen>>(
    "/api/ordenes/mis-ordenes",
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

export async function getMiOrdenDetalleApi(
  ordenId: number
): Promise<MiOrdenDetalle> {
  const response = await apiClient.get<MiOrdenDetalle>(
    `/api/ordenes/mis-ordenes/${ordenId}`
  );

  return response.data;
}