import {
    ActualizarConfiguracionSistemaRequest,
    CargoServicioEntradas,
    ConfiguracionSistema,
} from "../types/configuracion";
import { apiClient } from "./apiClient";

export async function getConfiguracionSistemaAdminApi(): Promise<ConfiguracionSistema> {
  const response = await apiClient.get<ConfiguracionSistema>(
    "/api/admin/configuracion-sistema"
  );

  return response.data;
}

export async function actualizarConfiguracionSistemaAdminApi(
  data: ActualizarConfiguracionSistemaRequest
): Promise<ConfiguracionSistema> {
  const response = await apiClient.put<ConfiguracionSistema>(
    "/api/admin/configuracion-sistema",
    data
  );

  return response.data;
}

export async function getCargoServicioEntradasApi(): Promise<CargoServicioEntradas> {
  const response = await apiClient.get<CargoServicioEntradas>(
    "/api/configuracion-sistema/cargo-servicio-entradas"
  );

  return response.data;
}