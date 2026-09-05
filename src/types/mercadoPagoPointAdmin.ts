export interface MercadoPagoTerminalAdminResponse {
  id: number;
  nombre: string;
  terminalId: string;

  posId?: string | null;
  storeId?: string | null;
  externalPosId?: string | null;
  operatingMode?: string | null;

  activa: boolean;
  estaEnModoPdv: boolean;

  fechaCreacion: string;
  fechaUltimaSincronizacion?: string | null;
}

export interface SincronizarMercadoPagoTerminalesResponse {
  encontradasMercadoPago: number;
  creadas: number;
  actualizadas: number;
  desactivadas: number;
  enModoPdv: number;

  terminales: MercadoPagoTerminalAdminResponse[];
}

export interface AsignarMercadoPagoTerminalCajaRequest {
  mercadoPagoTerminalId: number;
}

export interface MercadoPagoTerminalOperationResponse {
  message: string;
}
