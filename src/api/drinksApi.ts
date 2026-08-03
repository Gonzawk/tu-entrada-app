import { PagedResponse } from "../types/common";
import {
  BebidaCatalogo,
  BebidaDisponibleParaEvento,
  BebidaEventoAdmin,
  BebidaOrden,
  BebidaOrdenBarra,
  BebidaProducto,
  CrearBebidaOrdenPagoResponse,
  CrearBebidaOrdenRequest
} from "../types/drinks";
import { apiClient } from "./apiClient";

export async function getBebidasAdminApi(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PagedResponse<BebidaProducto>> {
  const response = await apiClient.get("/api/admin/bebidas", {
    params: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
      search: params?.search ?? "",
    },
  });

  return response.data;
}

export async function crearBebidaAdminApi(formData: FormData) {
  const response = await apiClient.post("/api/admin/bebidas", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function actualizarBebidaAdminApi(id: number, formData: FormData) {
  const response = await apiClient.put(`/api/admin/bebidas/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function cambiarDisponibilidadGlobalBebidaApi(
  bebidaProductoId: number,
  disponible: boolean
) {
  const response = await apiClient.patch(
    `/api/admin/bebidas/${bebidaProductoId}/disponibilidad`,
    { disponible }
  );

  return response.data;
}

export async function eliminarBebidaAdminApi(bebidaProductoId: number) {
  const response = await apiClient.delete(`/api/admin/bebidas/${bebidaProductoId}`);
  return response.data;
}

export async function getCatalogoAdminParaEventoApi(params: {
  eventoId: number;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PagedResponse<BebidaDisponibleParaEvento>> {
  const response = await apiClient.get(
    `/api/admin/bebidas/eventos/${params.eventoId}/catalogo-admin`,
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

export async function asignarBebidasMasivoEventoApi(
  eventoId: number,
  items: {
    bebidaProductoId: number;
    precioEvento?: number | null;
    disponible: boolean;
  }[]
) {
  const response = await apiClient.post(
    `/api/admin/bebidas/eventos/${eventoId}/asignar-masivo`,
    { items }
  );

  return response.data;
}

export async function getBebidasEventoAdminApi(params: {
  eventoId: number;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PagedResponse<BebidaEventoAdmin>> {
  const response = await apiClient.get(
    `/api/admin/bebidas/eventos/${params.eventoId}`,
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

export async function actualizarBebidaEventoApi(
  bebidaEventoId: number,
  request: {
    precioEvento?: number | null;
    disponible: boolean;
    activo: boolean;
  }
): Promise<BebidaEventoAdmin> {
  const response = await apiClient.put(
    `/api/admin/bebidas/evento/${bebidaEventoId}`,
    request
  );

  return response.data;
}

export async function cambiarDisponibilidadEventoApi(
  bebidaEventoId: number,
  disponible: boolean
) {
  const response = await apiClient.patch(
    `/api/admin/bebidas/evento/${bebidaEventoId}/disponibilidad`,
    { disponible }
  );

  return response.data;
}

export async function getCatalogoBebidasApi(params: {
  eventoId?: number | null;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PagedResponse<BebidaCatalogo>> {
  const response = await apiClient.get("/api/bebidas/catalogo", {
    params: {
      eventoId: params.eventoId ?? undefined,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      search: params.search ?? "",
    },
  });

  return response.data;
}

export async function crearOrdenBebidasApi(
  request: CrearBebidaOrdenRequest
): Promise<CrearBebidaOrdenPagoResponse> {
  const response = await apiClient.post("/api/bebidas/ordenes", request);
  return response.data;
}
export async function getMisOrdenesBebidasApi(params?: {
  page?: number;
  pageSize?: number;
}): Promise<PagedResponse<BebidaOrden>> {
  const response = await apiClient.get("/api/bebidas/mis-ordenes", {
    params: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 5,
    },
  });

  return response.data;
}

export async function getMiOrdenBebidaDetalleApi(
  ordenId: number
): Promise<BebidaOrden> {
  const response = await apiClient.get(`/api/bebidas/mis-ordenes/${ordenId}`);
  return response.data;
}

export async function escanearOrdenBebidaBarraApi(
  codigoQR: string
): Promise<BebidaOrdenBarra> {
  const response = await apiClient.post("/api/bebidas/barra/escanear", {
    codigoQR,
  });

  return response.data;
}

export async function entregarOrdenBebidaBarraApi(
  ordenId: number
): Promise<BebidaOrden> {
  const response = await apiClient.post(
    `/api/bebidas/barra/ordenes/${ordenId}/entregar`
  );

  return response.data;
}

export async function reintentarPagoBebidaOrdenApi(
  ordenId: number
): Promise<CrearBebidaOrdenPagoResponse> {
  const response = await apiClient.post(
    `/api/bebidas/ordenes/${ordenId}/reintentar-pago`
  );

  return response.data;
}

export async function registrarUsoDudosoBebidaScannerApi(data: {
  codigoQR: string;
  intentos: number;
  motivo: string;
}) {
  const response = await apiClient.post("/api/barra/scanner/uso-dudoso", data);
  return response.data;
}