import {
    AsignarMercadoPagoTerminalCajaRequest,
    MercadoPagoTerminalAdminResponse,
    MercadoPagoTerminalOperationResponse,
    SincronizarMercadoPagoTerminalesResponse,
} from "../types/mercadoPagoPointAdmin";
import { apiClient } from "./apiClient";

export async function getAdminMercadoPagoTerminalesApi(
  soloActivas = false
): Promise<MercadoPagoTerminalAdminResponse[]> {
  const response = await apiClient.get<MercadoPagoTerminalAdminResponse[]>(
    "/api/admin/mercadopago-point/terminales",
    {
      params: { soloActivas },
    }
  );

  return response.data;
}

export async function getAdminMercadoPagoTerminalApi(
  terminalId: number
): Promise<MercadoPagoTerminalAdminResponse> {
  const response = await apiClient.get<MercadoPagoTerminalAdminResponse>(
    `/api/admin/mercadopago-point/terminales/${terminalId}`
  );

  return response.data;
}

export async function sincronizarAdminMercadoPagoTerminalesApi(): Promise<SincronizarMercadoPagoTerminalesResponse> {
  const response =
    await apiClient.post<SincronizarMercadoPagoTerminalesResponse>(
      "/api/admin/mercadopago-point/terminales/sincronizar"
    );

  return response.data;
}

export async function asignarAdminMercadoPagoTerminalACajaApi(
  cajaId: number,
  mercadoPagoTerminalId: number
): Promise<MercadoPagoTerminalOperationResponse> {
  const request: AsignarMercadoPagoTerminalCajaRequest = {
    mercadoPagoTerminalId,
  };

  const response =
    await apiClient.put<MercadoPagoTerminalOperationResponse>(
      `/api/admin/mercadopago-point/cajas/${cajaId}/terminal`,
      request
    );

  return response.data;
}

export async function desasignarAdminMercadoPagoTerminalDeCajaApi(
  cajaId: number
): Promise<MercadoPagoTerminalOperationResponse> {
  const response =
    await apiClient.delete<MercadoPagoTerminalOperationResponse>(
      `/api/admin/mercadopago-point/cajas/${cajaId}/terminal`
    );

  return response.data;
}