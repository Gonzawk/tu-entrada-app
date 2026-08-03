import {
  AdminCrearUsuarioRequest,
  AdminUsuario,
} from "../types/adminUsers";
import { UserRole } from "../types/auth";
import { PagedResponse } from "../types/common";
import { apiClient } from "./apiClient";

export async function getAdminUsuariosApi(params: {
  page: number;
  pageSize: number;
  search?: string;
  rol?: string;
}): Promise<PagedResponse<AdminUsuario>> {
  const response = await apiClient.get("/api/admin/usuarios", {
    params: {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search ?? "",
      rol: params.rol ?? "",
    },
  });

  return response.data;
}

export async function getAdminUsuarioDetalleApi(usuarioId: number) {
  const response = await apiClient.get(`/api/admin/usuarios/${usuarioId}`);
  return response.data;
}

export async function actualizarAdminUsuarioApi(
  usuarioId: number,
  data: {
    nombreCompleto: string;
    email: string;
    telefono?: string | null;
  }
) {
  const response = await apiClient.put(
    `/api/admin/usuarios/${usuarioId}`,
    data
  );

  return response.data;
}

export async function crearAdminUsuarioApi(
  request: AdminCrearUsuarioRequest
): Promise<AdminUsuario> {
  const response = await apiClient.post("/api/admin/usuarios", request);
  return response.data;
}

export async function cambiarEstadoAdminUsuarioApi(
  usuarioId: number,
  activo: boolean
) {
  const response = await apiClient.patch(
    `/api/admin/usuarios/${usuarioId}/estado`,
    { activo }
  );

  return response.data;
}

export async function cambiarVerificacionEmailUsuarioApi(
  usuarioId: number,
  emailVerificado: boolean
) {
  const response = await apiClient.patch(
    `/api/admin/usuarios/${usuarioId}/verificar-email`,
    { emailVerificado }
  );

  return response.data;
}

export async function agregarRolAdminUsuarioApi(
  usuarioId: number,
  rol: UserRole
) {
  const response = await apiClient.post(
    `/api/admin/usuarios/${usuarioId}/roles`,
    { rol }
  );

  return response.data;
}

export async function quitarRolAdminUsuarioApi(
  usuarioId: number,
  rol: UserRole
) {
  const response = await apiClient.delete(
    `/api/admin/usuarios/${usuarioId}/roles/${rol}`
  );

  return response.data;
}


export async function getUsuariosVentanillaAdminApi(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const response = await apiClient.get("/api/admin/usuarios/ventanilla", {
    params: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
      search: params?.search ?? "",
    },
  });

  return response.data;
}

export async function crearUsuarioVentanillaAdminApi(data: {
  nombreCompleto: string;
  email: string;
  telefono?: string | null;
  password: string;
}) {
  const response = await apiClient.post(
    "/api/admin/usuarios/ventanilla",
    data
  );

  return response.data;
}

export async function crearUsuarioBarraAdminApi(data: {
  nombreCompleto: string;
  email: string;
  telefono?: string | null;
  password: string;
}) {
  const response = await apiClient.post("/api/admin/usuarios/barra", data);
  return response.data;
}

export async function getUsuariosBarraAdminApi(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const response = await apiClient.get("/api/admin/usuarios/barra", {
    params: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
      search: params?.search ?? "",
    },
  });

  return response.data;
}

