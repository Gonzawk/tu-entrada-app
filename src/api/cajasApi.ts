import { AbrirCajaRequest, Caja, CerrarCajaRequest, TipoCaja } from "../types/cajas";
import { PagedResponse } from "../types/common";
import { apiClient } from "./apiClient";

export async function abrirCajaApi(data: AbrirCajaRequest): Promise<Caja> {
  const response = await apiClient.post<Caja>("/api/cajas/abrir", data);
  return response.data;
}

export async function getCajaAbiertaApi(tipoCaja: TipoCaja): Promise<Caja | null> {
  const response = await apiClient.get<Caja | null>("/api/cajas/abierta", {
    params: { tipoCaja },
  });

  return response.data;
}

export async function cerrarCajaApi(
  cajaId: number,
  data: CerrarCajaRequest
): Promise<Caja> {
  const response = await apiClient.put<Caja>(`/api/cajas/${cajaId}/cerrar`, data);
  return response.data;
}

export async function getCajasAdminApi(params?: {
  page?: number;
  pageSize?: number;
  eventoId?: number | null;
  tipoCaja?: TipoCaja | null;
  estado?: number | null;
}): Promise<PagedResponse<Caja>> {
  const response = await apiClient.get<PagedResponse<Caja>>("/api/admin/cajas", {
    params: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
      eventoId: params?.eventoId ?? undefined,
      tipoCaja: params?.tipoCaja ?? undefined,
      estado: params?.estado ?? undefined,
    },
  });

  return response.data;
}