import {
    BirthdayRequest,
    CreateBirthdayRequest,
    CreateMultiTicketRequest,
    ResolveBirthdayRequest,
} from "../types/benefits";
import { PagedResponse } from "../types/common";
import { apiClient } from "./apiClient";

export async function crearSolicitudCumpleaniosApi(data: CreateBirthdayRequest) {
  const response = await apiClient.post("/api/cumpleanios/solicitar", data);
  return response.data;
}

export async function getMisSolicitudesCumpleaniosApi(): Promise<BirthdayRequest[]> {
  const response = await apiClient.get<BirthdayRequest[]>(
    "/api/cumpleanios/mis-solicitudes"
  );

  return response.data;
}

export async function getSolicitudesCumpleaniosAdminApi(params?: {
  page?: number;
  pageSize?: number;
}): Promise<PagedResponse<BirthdayRequest>> {
  const response = await apiClient.get<PagedResponse<BirthdayRequest>>(
    "/api/admin/beneficios/cumpleanios",
    {
      params: {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 10,
      },
    }
  );

  return response.data;
}

export async function resolverSolicitudCumpleaniosAdminApi(
  solicitudId: number,
  data: ResolveBirthdayRequest
) {
  const response = await apiClient.put(
    `/api/admin/beneficios/cumpleanios/${solicitudId}/resolver`,
    data
  );

  return response.data;
}

export async function crearTicketMultiIngresoAdminApi(
  data: CreateMultiTicketRequest
) {
  const response = await apiClient.post(
    "/api/admin/beneficios/multiingreso",
    data
  );

  return response.data;
}