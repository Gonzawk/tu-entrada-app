import {
  ActualizarTipoEntradaRequest,
  AdminEventosPagedResponse,
  CrearEventoRequest,
  CrearRRPPRequest,
  CrearTandaRequest,
  CrearTipoEntradaRequest,
  RRPPAdmin,
  UsuarioLookup,
  UsuarioPuerta
} from "../types/admin";
import { PagedResponse } from "../types/common";
import { ActualizarTandaEntradaRequest, RRPPDisponible } from "../types/events";
import { apiClient } from "./apiClient";

export async function crearEventoAdminApi(data: CrearEventoRequest) {
  const response = await apiClient.post("/api/eventos", data);
  return response.data;
}

export async function publicarEventoAdminApi(eventoId: number) {
  const response = await apiClient.put(`/api/eventos/${eventoId}/publicar`);
  return response.data;
}

export async function eliminarEventoAdminApi(eventoId: number) {
  const response = await apiClient.delete(`/api/eventos/${eventoId}`);
  return response.data;
}

export async function crearTipoEntradaAdminApi(
  eventoId: number,
  data: CrearTipoEntradaRequest
) {
  const response = await apiClient.post(
    `/api/eventos/${eventoId}/tipos-entrada`,
    data
  );
  return response.data;
}

export async function actualizarTipoEntradaAdminApi(
  eventoId: number,
  tipoEntradaId: number,
  body: ActualizarTipoEntradaRequest
) {
  const { data } = await apiClient.put(
    `/api/eventos/${eventoId}/tipos-entrada/${tipoEntradaId}`,
    body
  );

  return data;
}

export async function eliminarTipoEntradaAdminApi(
  eventoId: number,
  tipoEntradaId: number
) {
  const { data } = await apiClient.delete(
    `/api/eventos/${eventoId}/tipos-entrada/${tipoEntradaId}`
  );

  return data;
}

export async function crearTandaAdminApi(
  tipoEntradaId: number,
  data: CrearTandaRequest
) {
  const response = await apiClient.post(
    `/api/eventos/tipos-entrada/${tipoEntradaId}/tandas`,
    data
  );
  return response.data;
}

export async function actualizarTandaAdminApi(
  tipoEntradaId: number,
  tandaId: number,
  request: ActualizarTandaEntradaRequest
) {
  const response = await apiClient.put(
    `/api/eventos/tipos-entrada/${tipoEntradaId}/tandas/${tandaId}`,
    request
  );

  return response.data;
}

export async function cambiarEstadoTandaAdminApi(
  tandaId: number,
  estado: number
) {
  const response = await apiClient.put(`/api/eventos/tandas/${tandaId}/estado`, {
    estado,
  });
  return response.data;
}

export async function getRRPPAdminPaginadoApi(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PagedResponse<RRPPAdmin>> {
  const response = await apiClient.get<PagedResponse<RRPPAdmin>>(
    "/api/rrpp/admin",
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

export async function crearRRPPAdminApi(data: CrearRRPPRequest) {
  const formData = new FormData();

  formData.append("usuarioId", String(data.usuarioId));
  formData.append("nombrePublico", data.nombrePublico);

  if (data.instagram)
    formData.append("instagram", data.instagram);

  if (data.telefonoContacto)
    formData.append("telefonoContacto", data.telefonoContacto);

  if (data.avatarUrl)
    formData.append("avatarUrl", data.avatarUrl);

  if (data.avatar) {
    formData.append("avatar", {
      uri: data.avatar.uri,
      name: data.avatar.name,
      type: data.avatar.type,
    } as any);
  }

  const response = await apiClient.post(
    "/api/rrpp/admin/rrpp",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}

export async function cambiarEstadoRRPPAdminApi(rrppId: number, activo: boolean) {
  const response = await apiClient.put(`/api/rrpp/${rrppId}/estado`, {
    activo,
  });
  return response.data;
}

export async function asignarRRPPAEventoAdminApi(
  eventoId: number,
  rrppUsuarioId: number
) {
  const response = await apiClient.post(`/api/admin/eventos/${eventoId}/rrpps`, {
    rrppUsuarioId,
  });
  return response.data;
}

export async function getRRPPsEventoAdminApi(params: {
  eventoId: number;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PagedResponse<RRPPDisponible>> {
  const response = await apiClient.get<PagedResponse<RRPPDisponible>>(
    `/api/admin/eventos/${params.eventoId}/rrpps`,
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

export async function cambiarEstadoRRPPEventoAdminApi(
  eventoId: number,
  rrppUsuarioId: number,
  activo: boolean
) {
  const response = await apiClient.put(
    `/api/admin/eventos/${eventoId}/rrpps/${rrppUsuarioId}/estado`,
    { activo }
  );
  return response.data;
}

export async function getUsuariosPuertaAdminApi(): Promise<UsuarioPuerta[]> {
  const response = await apiClient.get<UsuarioPuerta[]>(
    "/api/admin/puerta/usuarios"
  );
  return response.data;
}

export async function crearUsuarioPuertaAdminApi(data: {
  email: string;
  password: string;
  nombreCompleto: string;
  telefono?: string;
}) {
  const response = await apiClient.post("/api/admin/puerta/usuarios", data);
  return response.data;
}

export async function cambiarEstadoUsuarioPuertaAdminApi(
  usuarioId: number,
  activo: boolean
) {
  const response = await apiClient.put(
    `/api/admin/puerta/usuarios/${usuarioId}/estado`,
    { activo }
  );
  return response.data;
}

export async function getEventosAdminApi(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<AdminEventosPagedResponse> {
  const response = await apiClient.get<AdminEventosPagedResponse>(
    "/api/eventos/admin/todos",
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

export async function actualizarImagenesEventoAdminApi(
  eventoId: number,
  data: {
    bannerUrl: string;
    imagenPrincipalUrl?: string | null;
  }
) {
  const response = await apiClient.put(`/api/eventos/${eventoId}/imagenes`, data);
  return response.data;
}

export async function actualizarImagenTipoEntradaAdminApi(
  tipoEntradaId: number,
  imagenUrl: string
) {
  const response = await apiClient.put(
    `/api/eventos/tipos-entrada/${tipoEntradaId}/imagen`,
    { imagenUrl }
  );

  return response.data;
}
export async function buscarUsuariosAdminApi(
  query: string
): Promise<UsuarioLookup[]> {
  const response = await apiClient.get<UsuarioLookup[]>(
    `/api/admin/usuarios/buscar?query=${encodeURIComponent(query)}`
  );

  return response.data;
}

export async function actualizarAvatarRRPPAdminApi(
  rrppId: number,
  avatarUrl: string | null
) {
  const response = await apiClient.put(`/api/rrpp/${rrppId}/avatar`, {
    avatarUrl,
  });

  return response.data;
}

export async function cambiarEstadoEventoAdminApi(
  eventoId: number,
  estado: number
) {
  const response = await apiClient.put(`/api/eventos/${eventoId}/estado`, {
    estado,
  });

  return response.data;
}

export async function getRendicionRRPPAdminApi(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const response = await apiClient.get("/api/ordenes/admin/rendicion-rrpp", {
    params: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 2,
      search: params?.search ?? "",
    },
  });

  return response.data;
}

export async function generarTicketsAdminApi(data: {
  eventoId: number;
  tipoEntradaId: number;
  cantidad: number;
  nombrePendiente?: string | null;
  emailPendiente?: string | null;
  observacion?: string | null;
}) {
  const response = await apiClient.post("/api/tickets/admin/generar", data);
  return response.data;
}

export async function getTicketsAdminManualesApi() {
  const response = await apiClient.get("/api/tickets/admin/manuales");
  return response.data;
}

export async function subirImagenAdminApi(file: {
  uri: string;
  name: string;
  type: string;
}): Promise<{
  url: string;
  displayUrl?: string;
}> {
  const formData = new FormData();

  formData.append(
    "file",
    {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any
  );

  console.log("UPLOAD - iniciando petición", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  });

  try {
    const response = await apiClient.post(
      "/api/admin/uploads/image",
      formData,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      }
    );

    console.log("UPLOAD - respuesta recibida", {
      status: response.status,
      data: response.data,
    });

    return response.data;
  } catch (error: any) {
    console.log("UPLOAD - error completo", {
      message: error?.message,
      code: error?.code,
      status: error?.response?.status,
      data: error?.response?.data,
      url: error?.config?.url,
      baseURL: error?.config?.baseURL,
      headers: error?.config?.headers,
    });

    throw error;
  }
}