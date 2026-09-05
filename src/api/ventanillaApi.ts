import { PagedResponse } from "../types/common";
import {
  VentaPresencialEstadoPagoResponse,
} from "../types/mercadoPagoPoint";
import {
  CrearVentaVentanillaRequest,
  VentaVentanilla,
  VentanillaCaja,
  VentanillaCajaDetalle,
  VentanillaEntradaDisponible,
  VentanillaResumenCaja,
} from "../types/ventanilla";
import { apiClient } from "./apiClient";

export async function getVentanillaEntradasDisponiblesApi(
  eventoId: number
): Promise<VentanillaEntradaDisponible[]> {
  const response = await apiClient.get<VentanillaEntradaDisponible[]>(
    "/api/ventanilla/entradas-disponibles",
    {
      params: { eventoId },
    }
  );

  return response.data;
}

export async function crearVentaVentanillaApi(
  data: CrearVentaVentanillaRequest
): Promise<VentaVentanilla> {
  const response = await apiClient.post<VentaVentanilla>(
    "/api/ventanilla/ventas",
    data
  );

  return response.data;
}

export async function getEstadoPagoVentaVentanillaApi(
  ventaId: number
): Promise<VentaPresencialEstadoPagoResponse> {
  const response =
    await apiClient.get<VentaPresencialEstadoPagoResponse>(
      `/api/ventanilla/ventas/${ventaId}/estado-pago`
    );

  return response.data;
}

export async function cancelarPagoPointVentaVentanillaApi(
  ventaId: number
): Promise<VentaPresencialEstadoPagoResponse> {
  const response =
    await apiClient.post<VentaPresencialEstadoPagoResponse>(
      `/api/ventanilla/ventas/${ventaId}/cancelar-pago`
    );

  return response.data;
}

export async function getVentasVentanillaPaginadasApi(params: {
  cajaId: number;
  page?: number;
  pageSize?: number;
}): Promise<PagedResponse<VentaVentanilla>> {
  const response = await apiClient.get<PagedResponse<VentaVentanilla>>(
    "/api/ventanilla/ventas",
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

export async function getResumenCajaVentanillaApi(
  cajaId: number
): Promise<VentanillaResumenCaja> {
  const response = await apiClient.get<VentanillaResumenCaja>(
    `/api/ventanilla/cajas/${cajaId}/resumen`
  );

  return response.data;
}

export async function getMisCajasVentanillaApi(params?: {
  page?: number;
  pageSize?: number;
}): Promise<PagedResponse<VentanillaCaja>> {
  const response = await apiClient.get<PagedResponse<VentanillaCaja>>(
    "/api/ventanilla/mis-cajas",
    {
      params: {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 10,
      },
    }
  );

  return response.data;
}

export async function getMiCajaVentanillaDetalleApi(
  cajaId: number
): Promise<VentanillaCajaDetalle> {
  const response = await apiClient.get<VentanillaCajaDetalle>(
    `/api/ventanilla/mis-cajas/${cajaId}`
  );

  return response.data;
}

export async function getVentasMiCajaVentanillaApi(params: {
  cajaId: number;
  page?: number;
  pageSize?: number;
}): Promise<PagedResponse<VentaVentanilla>> {
  const response = await apiClient.get<PagedResponse<VentaVentanilla>>(
    `/api/ventanilla/mis-cajas/${params.cajaId}/ventas`,
    {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      },
    }
  );

  return response.data;
}
