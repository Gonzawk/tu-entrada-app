import {
  BarraCaja,
  BarraCajaDetalle,
  BarraCajaVenta,
  BarraResumenCaja,
  CrearVentaBarraRequest,
  VentaBarra,
} from "../types/barra";
import { PagedResponse } from "../types/common";
import { apiClient } from "./apiClient";

export async function crearVentaBarraApi(
  data: CrearVentaBarraRequest
): Promise<VentaBarra> {
  const response = await apiClient.post<VentaBarra>("/api/barra/ventas", data);
  return response.data;
}

export async function getVentasBarraPaginadasApi(params: {
  cajaId: number;
  page?: number;
  pageSize?: number;
}): Promise<PagedResponse<VentaBarra>> {
  const response = await apiClient.get<PagedResponse<VentaBarra>>(
    "/api/barra/ventas",
    {
      params: {
        cajaId: params.cajaId,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      },
    }
  );

  return response.data;
}

export async function getResumenCajaBarraApi(
  cajaId: number
): Promise<BarraResumenCaja> {
  const response = await apiClient.get<BarraResumenCaja>(
    `/api/barra/cajas/${cajaId}/resumen`
  );

  return response.data;
}



export async function getMisCajasBarraApi(params?: {
  page?: number;
  pageSize?: number;
}): Promise<PagedResponse<BarraCaja>> {
  const response = await apiClient.get<PagedResponse<BarraCaja>>(
    "/api/barra/mis-cajas",
    {
      params: {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 10,
      },
    }
  );

  return response.data;
}

export async function getMiCajaBarraDetalleApi(
  cajaId: number
): Promise<BarraCajaDetalle> {
  const response = await apiClient.get<BarraCajaDetalle>(
    `/api/barra/mis-cajas/${cajaId}`
  );

  return response.data;
}

export async function getVentasMiCajaBarraApi(params: {
  cajaId: number;
  page?: number;
  pageSize?: number;
}): Promise<PagedResponse<BarraCajaVenta>> {
  const response = await apiClient.get(
    `/api/barra/mis-cajas/${params.cajaId}/ventas`,
    {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      },
    }
  );

  return response.data;
}