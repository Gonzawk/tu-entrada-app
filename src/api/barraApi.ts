import {
  BarraCaja,
  BarraCajaDetalle,
  BarraCajaVenta,
  BarraResumenCaja,
  CrearVentaBarraRequest,
  VentaBarra,
} from "../types/barra";
import { PagedResponse } from "../types/common";
import {
  VentaBarraPointCreada,
  VentaPresencialEstadoPagoResponse,
} from "../types/mercadoPagoPoint";
import { apiClient } from "./apiClient";

export async function crearVentaBarraApi(
  data: CrearVentaBarraRequest
): Promise<VentaBarraPointCreada> {
  const response = await apiClient.post<VentaBarraPointCreada>(
    "/api/barra/ventas",
    data
  );

  return response.data;
}

export async function getEstadoPagoVentaBarraApi(
  ventaId: number
): Promise<VentaPresencialEstadoPagoResponse> {
  const response =
    await apiClient.get<VentaPresencialEstadoPagoResponse>(
      `/api/barra/ventas/${ventaId}/estado-pago`
    );

  return response.data;
}

export async function cancelarPagoPointVentaBarraApi(
  ventaId: number
): Promise<VentaPresencialEstadoPagoResponse> {
  const response =
    await apiClient.post<VentaPresencialEstadoPagoResponse>(
      `/api/barra/ventas/${ventaId}/cancelar-pago`
    );

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
  const response = await apiClient.get<PagedResponse<BarraCajaVenta>>(
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


export interface ProductoVentaResumen {
  bebidaProductoId: number;
  nombre: string;
  cantidadVendida: number;
}

export interface AdminBarraVentasResumen {
  ordenesCompletadas: number;
  cantidadProductosVendidos: number;

  productoMasVendido?: ProductoVentaResumen | null;
  productoMenosVendido?: ProductoVentaResumen | null;

  eventoId?: number | null;
  eventoNombre?: string | null;
}

export async function getResumenVentasBarraAdminApi(
  eventoId?: number | null
): Promise<AdminBarraVentasResumen> {
  const response =
    await apiClient.get<AdminBarraVentasResumen>(
      "/api/barra/barra/resumen-ventas",
      {
        params: eventoId
          ? { eventoId }
          : undefined,
      }
    );

  return response.data;
}